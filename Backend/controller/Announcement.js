import prisma from "../lib/prisma.js";
import { createNotification } from "../service/Notification.js";
import { sendTelegramMessage, deleteTelegramMessage } from "../service/Telegram.js";

export const createAnnouncement = async (req, res) => {
  try {
    const { title, announcement, dates, target_employee_ids } = req.body;
    const company_id = req.user.company_id;

    if (!title || !announcement) {
      return res.status(400).json({ result: false, message: "Title and content are required." });
    }

    // Create the announcement in the database
    const newAnnouncement = await prisma.announcement.create({
      data: {
        company_id: parseInt(company_id),
        title,
        announcement,
        dates: dates || null,
        target_employee_ids: target_employee_ids || null,
      },
    });

    // Load company details for Telegram bot configuration
    const company = await prisma.company.findUnique({
      where: { id: parseInt(company_id) },
    });

    // 1. Fetch targeted employees
    let targetedEmployees = [];
    const isTargeted = Array.isArray(target_employee_ids) && target_employee_ids.length > 0;

    if (isTargeted) {
      targetedEmployees = await prisma.employee.findMany({
        where: {
          company_id: parseInt(company_id),
          is_active: "active",
          id: { in: target_employee_ids.map(Number) },
        },
        include: { user: true },
      });
    } else {
      targetedEmployees = await prisma.employee.findMany({
        where: {
          company_id: parseInt(company_id),
          is_active: "active",
        },
        include: { user: true },
      });
    }

    // 2. Dispatch database & Socket.io notifications
    for (const emp of targetedEmployees) {
      // Each employee has a relation user[] (since user has employee_id? or employee has user[] due to prisma mapping)
      // Let's get the first user ID associated with this employee
      const user = emp.user?.[0];
      if (user) {
        await createNotification(
          company_id,
          `Announcement: ${title}`,
          announcement,
          user.id,
          newAnnouncement.id
        );
      }
    }

    // 3. Dispatch Telegram group notification
    const activeGroupId = company?.telegram_announcement_group_id || company?.telegram_group_id;
    if (company?.telegram_bot_token && activeGroupId) {
      let tgMessage = `📢 <b>${title}</b>\n`;
      tgMessage += `━━━━━━━━━━━━━━━━━\n`;
      tgMessage += `${announcement}\n\n`;
      
      if (Array.isArray(dates) && dates.length > 0) {
        tgMessage += `📅 <b>Dates:</b> ${dates.join(", ")}\n`;
      }
      tgMessage += `━━━━━━━━━━━━━━━━━\n`;

      const mentions = targetedEmployees.map((emp) => {
        if (emp.telegram_username) {
          const cleanUsername = emp.telegram_username.trim().replace(/^@+/, "");
          return `@${cleanUsername}`;
        }
        return `<b>${emp.first_name} ${emp.last_name}</b>`;
      });

      if (mentions.length > 0) {
        tgMessage += `👥 <b>Mentions:</b> ${mentions.join(", ")}`;
      } else {
        tgMessage += `👥 <b>Mentions:</b> @all`;
      }

      try {
        const tgRes = await sendTelegramMessage(
          company.telegram_bot_token,
          activeGroupId,
          tgMessage
        );
        console.log("[Telegram] Announcement message broadcasted successfully");

        if (tgRes && tgRes !== false && tgRes.result?.message_id) {
          await prisma.announcement.update({
            where: { id: newAnnouncement.id },
            data: {
              telegram_message_id: tgRes.result.message_id,
            },
          });
        }
      } catch (tgErr) {
        console.error("[Telegram] Error broadcasting announcement:", tgErr.message);
      }
    }

    res.status(201).json({
      result: true,
      message: "Announcement created successfully.",
      data: newAnnouncement,
    });
  } catch (error) {
    console.error("[Announcement Controller] Error:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getAnnouncements = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const announcements = await prisma.announcement.findMany({
      where: { company_id: parseInt(company_id) },
      orderBy: { created_at: "desc" },
    });
    res.status(200).json({ result: true, data: announcements });
  } catch (error) {
    console.error("[Announcement Controller] Error:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    // Fetch the announcement record first to retrieve telegram_message_id
    const announcementRecord = await prisma.announcement.findFirst({
      where: {
        id: parseInt(id),
        company_id: parseInt(company_id),
      },
    });

    // 1. Delete associated Telegram message if it exists
    if (announcementRecord && announcementRecord.telegram_message_id) {
      const company = await prisma.company.findUnique({
        where: { id: parseInt(company_id) },
      });

      const activeGroupId = company?.telegram_announcement_group_id || company?.telegram_group_id;
      if (company?.telegram_bot_token && activeGroupId) {
        try {
          await deleteTelegramMessage(
            company.telegram_bot_token,
            activeGroupId,
            announcementRecord.telegram_message_id
          );
          console.log("[Telegram] Announcement message deleted successfully from group");
        } catch (tgErr) {
          console.error("[Telegram] Error deleting announcement message:", tgErr.message);
        }
      }
    }

    // 2. Delete associated notifications
    await prisma.notification.deleteMany({
      where: {
        company_id: parseInt(company_id),
        reference_id: parseInt(id),
        title: {
          startsWith: "Announcement: ",
        },
      },
    });

    // 3. Delete the announcement from database
    await prisma.announcement.deleteMany({
      where: {
        id: parseInt(id),
        company_id: parseInt(company_id),
      },
    });

    res.status(200).json({ result: true, message: "Announcement deleted successfully." });
  } catch (error) {
    console.error("[Announcement Controller] Error:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
