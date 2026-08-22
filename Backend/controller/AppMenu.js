// Backend/controller/AppMenu.js
import prisma from "../lib/prisma.js";
import { uploadToStorage, getStorageUrl } from "../service/Storage.js";
import { getIO } from "../utils/socket.js";

const DEFAULT_MENUS = [
  { menu_key: "online-attendance", label: "Online Attendance", color: "blue", order: 1 },
  { menu_key: "leave", label: "Leave", color: "orange", order: 2 },
  { menu_key: "overtime", label: "Overtime", color: "orange", order: 3 },
  { menu_key: "kpi", label: "Performance (KPI)", color: "blue", order: 4 },
  { menu_key: "calendar", label: "Holiday Calendar", color: "blue", order: 5 },
  { menu_key: "asset", label: "Asset Management", color: "blue", order: 6 },
];

/**
 * GET /api/app-menu
 * Retrieves all active app menu items for the company.
 */
export const getAppMenusController = async (req, res) => {
  try {
    const userCompanyId = req.user?.company_id || req.user?.employee?.company_id;

    if (!userCompanyId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const companyExists = await prisma.company.findUnique({
      where: { id: userCompanyId },
      select: { id: true },
    });
    if (!companyExists) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    // Migrate legacy 'performance' entry to 'kpi' if applicable
    const legacyPerformanceMenu = await prisma.appmenu.findFirst({
      where: { company_id: userCompanyId, menu_key: "performance" },
    });
    if (legacyPerformanceMenu) {
      const kpiExists = await prisma.appmenu.findFirst({
        where: { company_id: userCompanyId, menu_key: "kpi" },
      });
      if (!kpiExists) {
        await prisma.appmenu.update({
          where: { id: legacyPerformanceMenu.id },
          data: {
            menu_key: "kpi",
            label: legacyPerformanceMenu.label === "Performance" || !legacyPerformanceMenu.label
              ? "Performance (KPI)"
              : legacyPerformanceMenu.label,
          },
        });
      } else {
        await prisma.appmenu.delete({ where: { id: legacyPerformanceMenu.id } }).catch(() => {});
      }
    }

    // Clean up deprecated menu keys
    await prisma.appmenu.deleteMany({
      where: {
        company_id: userCompanyId,
        menu_key: { in: ["performance", "document-scanner"] },
      },
    }).catch(() => {});

    let menus = await prisma.appmenu.findMany({
      where: { company_id: userCompanyId, NOT: { menu_key: { in: ["document-scanner", "performance"] } } },
      orderBy: { order: "asc" },
    });

    // Auto-seed missing default menus (e.g. KPI for existing companies in production)
    const existingKeys = new Set(menus.map((m) => m.menu_key));
    const missingDefaults = DEFAULT_MENUS.filter((d) => !existingKeys.has(d.menu_key));

    if (missingDefaults.length > 0) {
      for (const item of missingDefaults) {
        await prisma.appmenu.upsert({
          where: {
            company_id_menu_key: {
              company_id: userCompanyId,
              menu_key: item.menu_key,
            },
          },
          update: {},
          create: {
            company_id: userCompanyId,
            menu_key: item.menu_key,
            label: item.label,
            color: item.color,
            order: item.order,
            is_active: true,
          },
        }).catch((err) => console.warn(`[AppMenu] Could not auto-seed missing menu ${item.menu_key}:`, err.message));
      }

      menus = await prisma.appmenu.findMany({
        where: { company_id: userCompanyId, NOT: { menu_key: { in: ["document-scanner", "performance"] } } },
        orderBy: { order: "asc" },
      });
    }

    res.status(200).json({ success: true, data: menus });
  } catch (error) {
    console.error("[AppMenu/get] Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/app-menu/:id
 * Updates menu label, color, active status, order, or uploads a new icon to Cloudflare R2.
 */
export const updateAppMenuController = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, color, is_active, order, icon_url } = req.body || {};
    const userCompanyId = req.user?.company_id || req.user?.employee?.company_id;

    const whereClause = userCompanyId
      ? { id: parseInt(id), company_id: userCompanyId }
      : { id: parseInt(id) };

    let existingMenu = await prisma.appmenu.findFirst({
      where: whereClause,
    });

    if (!existingMenu) {
      existingMenu = await prisma.appmenu.findUnique({
        where: { id: parseInt(id) },
      });
    }

    if (!existingMenu) {
      return res.status(404).json({ success: false, message: "Menu item not found" });
    }

    let iconUrl = existingMenu.icon_url;

    // Handle Icon File Upload to Cloudflare R2 if attached
    if (req.files && req.files.icon) {
      const iconFile = req.files.icon;
      const fileExt = iconFile.name ? iconFile.name.split('.').pop() : 'png';
      const filename = `${existingMenu.menu_key}_${Date.now()}.${fileExt}`;

      const dbPath = await uploadToStorage(iconFile.data, "app-menu", filename, iconFile.mimetype || 'image/png');
      if (dbPath) {
        iconUrl = getStorageUrl(dbPath);
      }
    } else if (icon_url !== undefined) {
      iconUrl = icon_url;
    }

    const updateData = {
      ...(label !== undefined && { label }),
      ...(color !== undefined && { color }),
      ...(is_active !== undefined && { is_active: is_active === "true" || is_active === true }),
      ...(order !== undefined && { order: parseInt(order) }),
      updated_at: new Date(),
    };

    if (iconUrl !== undefined) {
      updateData.icon_url = iconUrl;
    }

    const updated = await prisma.appmenu.update({
      where: { id: existingMenu.id },
      data: updateData,
    });

    // Broadcast real-time update via Socket.io
    try {
      const io = getIO();
      if (io) {
        io.emit("app-menu:updated", updated);
        if (existingMenu.company_id) {
          io.to(`company:${existingMenu.company_id}`).emit("app-menu:updated", updated);
        }
        console.log(`[Socket] Broadcasted app-menu:updated for menu_key: ${updated.menu_key}`);
      }
    } catch (socketErr) {
      console.warn("[AppMenu/socket] Could not emit socket event:", socketErr.message);
    }

    res.status(200).json({ success: true, message: "App menu updated successfully", data: updated });
  } catch (error) {
    console.error("[AppMenu/update] Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
