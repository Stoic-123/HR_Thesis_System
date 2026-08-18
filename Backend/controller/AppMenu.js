// Backend/controller/AppMenu.js
import prisma from "../lib/prisma.js";
import { uploadToStorage, getStorageUrl } from "../service/Storage.js";
import { getIO } from "../utils/socket.js";

const DEFAULT_MENUS = [
  { menu_key: "online-attendance", label: "Online Attendance", color: "blue", order: 1 },
  { menu_key: "leave", label: "Leave", color: "orange", order: 2 },
  { menu_key: "overtime", label: "Overtime", color: "orange", order: 3 },
  { menu_key: "performance", label: "Employee Performance", color: "blue", order: 4 },
  { menu_key: "calendar", label: "Holiday Calendar", color: "blue", order: 5 },
  { menu_key: "asset", label: "Asset Management", color: "blue", order: 6 },
];

/**
 * GET /api/app-menu
 * Retrieves all active app menu items for the company.
 */
export const getAppMenusController = async (req, res) => {
  try {
    let userCompanyId = req.user?.company_id || req.user?.employee?.company_id;

    if (userCompanyId) {
      const companyExists = await prisma.company.findUnique({
        where: { id: userCompanyId },
        select: { id: true },
      });
      if (!companyExists) {
        const fallbackCompany = await prisma.company.findFirst({ select: { id: true } });
        userCompanyId = fallbackCompany?.id;
      }
    } else {
      const fallbackCompany = await prisma.company.findFirst({ select: { id: true } });
      userCompanyId = fallbackCompany?.id;
    }

    if (!userCompanyId) {
      return res.status(200).json({ success: true, data: [] });
    }

    let menus = await prisma.appmenu.findMany({
      where: { company_id: userCompanyId, NOT: { menu_key: "document-scanner" } },
      orderBy: { order: "asc" },
    });

    // Auto-seed defaults if not initialized for this company yet
    if (menus.length === 0) {
      const seedData = DEFAULT_MENUS.map((item) => ({
        ...item,
        company_id: userCompanyId,
      }));
      await prisma.appmenu.createMany({ data: seedData });
      menus = await prisma.appmenu.findMany({
        where: { company_id: userCompanyId, NOT: { menu_key: "document-scanner" } },
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
    const { label, color, is_active, order } = req.body || {};
    const userCompanyId = req.user?.company_id || req.user?.employee?.company_id;

    const whereClause = userCompanyId
      ? { id: parseInt(id), company_id: userCompanyId }
      : { id: parseInt(id) };

    const existingMenu = await prisma.appmenu.findFirst({
      where: whereClause,
    });

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
    }

    const updated = await prisma.appmenu.update({
      where: { id: parseInt(id) },
      data: {
        ...(label !== undefined && { label }),
        ...(color !== undefined && { color }),
        ...(is_active !== undefined && { is_active: is_active === "true" || is_active === true }),
        ...(order !== undefined && { order: parseInt(order) }),
        ...(iconUrl && { icon_url: iconUrl }),
        updated_at: new Date(),
      },
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
