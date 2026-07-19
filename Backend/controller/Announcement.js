import prisma from "../lib/prisma.js";
import { createNotification } from "../service/Notification.js";
import {
  sendTelegramMessage,
  sendTelegramPhoto,
  deleteTelegramMessage,
  editTelegramMessage,
  editTelegramCaption,
} from "../service/Telegram.js";
import { validateFile } from "../utils/fileValidation.js";
import { uploadToStorage, deleteFromStorage, getStorageUrl } from "../service/Storage.js";

const safeParse = (val) => {
  if (!val) return null;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

export const createAnnouncement = async (req, res) => {
  try {
    const { title, announcement, dates, target_employee_ids } = req.body;
    const company_id = req.user.company_id;

    if (!title || !announcement) {
      return res.status(400).json({ result: false, message: "Title and content are required." });
    }

    // Process optional image upload
    let image_path = null;
    if (req.files && req.files.image) {
      const fileCheck = validateFile(req.files.image, "image");
      if (!fileCheck.isValid) {
        return res.status(400).json({ result: false, message: fileCheck.message });
      }
      const image = req.files.image;
      const imageName = Date.now() + "_" + image.name;
      image_path = await uploadToStorage(image.data, "announcements", imageName, image.mimetype);
    }

    const parsedDates = safeParse(dates);
    const parsedTargetIds = safeParse(target_employee_ids);

    // Create the announcement in the database
    const newAnnouncement = await prisma.announcement.create({
      data: {
        company_id: parseInt(company_id),
        title,
        announcement,
        dates: parsedDates || null,
        target_employee_ids: parsedTargetIds || null,
        image_path
      },
    });

    // Load company details for Telegram bot configuration
    const company = await prisma.company.findUnique({
      where: { id: parseInt(company_id) },
    });

    // 1. Fetch targeted employees
    let targetedEmployees = [];
    const isTargeted = Array.isArray(parsedTargetIds) && parsedTargetIds.length > 0;

    if (isTargeted) {
      targetedEmployees = await prisma.employee.findMany({
        where: {
          company_id: parseInt(company_id),
          is_active: "active",
          id: { in: parsedTargetIds.map(Number) },
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

    // 3. Resolve targeted department names
    let targetedDeptNames = [];
    const targetDeptIds = [...new Set(targetedEmployees.map(emp => emp.department_id).filter(Boolean))];
    if (targetDeptIds.length > 0) {
      try {
        const depts = await prisma.department.findMany({
          where: { id: { in: targetDeptIds } }
        });
        targetedDeptNames = depts.map(d => d.name);
      } catch (deptErr) {
        console.error("[Telegram] Error fetching targeted departments:", deptErr.message);
      }
    }

    // 4. Dispatch Telegram group notification
    const activeGroupId = company?.telegram_announcement_group_id || company?.telegram_group_id;
    if (company?.telegram_bot_token && activeGroupId) {
      let tgMessage = `📢 <b>${title}</b>\n`;
      tgMessage += `━━━━━━━━━━━━━━━━━\n`;
      tgMessage += `${announcement}\n\n`;
      
      if (Array.isArray(parsedDates) && parsedDates.length > 0) {
        tgMessage += `📅 <b>Dates:</b> ${parsedDates.join(", ")}\n`;
      }
      tgMessage += `━━━━━━━━━━━━━━━━━\n`;

      if (isTargeted) {
        if (targetedDeptNames.length > 0) {
          tgMessage += `🏢 <b>Target Departments:</b> ${targetedDeptNames.join(", ")}\n`;
        }
      } else {
        tgMessage += `🏢 <b>Target Departments:</b> All Departments\n`;
      }

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
        let tgRes = null;
        if (image_path) {
          const photoUrl = getStorageUrl(image_path);
          tgRes = await sendTelegramPhoto(
            company.telegram_bot_token,
            activeGroupId,
            photoUrl,
            tgMessage
          );
        } else {
          tgRes = await sendTelegramMessage(
            company.telegram_bot_token,
            activeGroupId,
            tgMessage
          );
        }
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

export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, announcement, dates, target_employee_ids } = req.body;
    const company_id = req.user.company_id;

    if (!title || !announcement) {
      return res.status(400).json({ result: false, message: "Title and content are required." });
    }

    // Find existing record
    const existing = await prisma.announcement.findFirst({
      where: { id: parseInt(id), company_id: parseInt(company_id) },
    });
    if (!existing) {
      return res.status(404).json({ result: false, message: "Announcement not found." });
    }

    const parsedDates = safeParse(dates);
    const parsedTargetIds = safeParse(target_employee_ids);

    // Handle optional new image upload
    let image_path = existing.image_path;
    let imageChanged = false;
    if (req.files && req.files.image) {
      const fileCheck = validateFile(req.files.image, "image");
      if (!fileCheck.isValid) {
        return res.status(400).json({ result: false, message: fileCheck.message });
      }
      const image = req.files.image;
      const imageName = Date.now() + "_" + image.name;
      image_path = await uploadToStorage(image.data, "announcements", imageName, image.mimetype);
      imageChanged = true;

      // Delete old image from R2
      if (existing.image_path) {
        await deleteFromStorage(existing.image_path);
      }
    }

    // Fetch targeted employees
    let targetedEmployees = [];
    const isTargeted = Array.isArray(parsedTargetIds) && parsedTargetIds.length > 0;

    if (isTargeted) {
      targetedEmployees = await prisma.employee.findMany({
        where: {
          company_id: parseInt(company_id),
          is_active: "active",
          id: { in: parsedTargetIds.map(Number) },
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

    // Resolve targeted department names
    let targetedDeptNames = [];
    const targetDeptIds = [...new Set(targetedEmployees.map(emp => emp.department_id).filter(Boolean))];
    if (targetDeptIds.length > 0) {
      try {
        const depts = await prisma.department.findMany({
          where: { id: { in: targetDeptIds } }
        });
        targetedDeptNames = depts.map(d => d.name);
      } catch (deptErr) {
        console.error("[Telegram] Error fetching targeted departments in update:", deptErr.message);
      }
    }

    // Build Telegram message text
    let tgMessage = `📢 <b>${title}</b>\n`;
    tgMessage += `━━━━━━━━━━━━━━━━━\n`;
    tgMessage += `${announcement}\n\n`;
    
    if (Array.isArray(parsedDates) && parsedDates.length > 0) {
      tgMessage += `📅 <b>Dates:</b> ${parsedDates.join(", ")}\n`;
    }
    tgMessage += `━━━━━━━━━━━━━━━━━\n`;

    if (isTargeted) {
      if (targetedDeptNames.length > 0) {
        tgMessage += `🏢 <b>Target Departments:</b> ${targetedDeptNames.join(", ")}\n`;
      }
    } else {
      tgMessage += `🏢 <b>Target Departments:</b> All Departments\n`;
    }

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

    tgMessage += `\n✏️ <i>(Updated)</i>`;

    // Handle Telegram update
    let newTelegramMessageId = existing.telegram_message_id;
    const company = await prisma.company.findUnique({ where: { id: parseInt(company_id) } });
    const activeGroupId = company?.telegram_announcement_group_id || company?.telegram_group_id;

    if (company?.telegram_bot_token && activeGroupId) {
      try {
        if (imageChanged) {
          // Image changed: delete old message, send new one with new photo
          if (existing.telegram_message_id) {
            try {
              await deleteTelegramMessage(
                company.telegram_bot_token,
                activeGroupId,
                existing.telegram_message_id
              );
            } catch (_) {}
          }

          // Send new message (with photo if image available, else text)
          const photoUrl = image_path ? getStorageUrl(image_path) : null;

          let tgRes;
          if (photoUrl) {
            tgRes = await sendTelegramPhoto(
              company.telegram_bot_token,
              activeGroupId,
              photoUrl,
              tgMessage
            );
          } else {
            tgRes = await sendTelegramMessage(
              company.telegram_bot_token,
              activeGroupId,
              tgMessage
            );
          }

          if (tgRes && tgRes.result?.message_id) {
            newTelegramMessageId = tgRes.result.message_id;
          }
          console.log("[Telegram] Announcement re-sent with new image");
        } else if (existing.telegram_message_id) {
          // No image change: just edit the existing message text/caption
          if (image_path) {
            await editTelegramCaption(
              company.telegram_bot_token,
              activeGroupId,
              existing.telegram_message_id,
              tgMessage
            );
          } else {
            await editTelegramMessage(
              company.telegram_bot_token,
              activeGroupId,
              existing.telegram_message_id,
              tgMessage
            );
          }
          console.log("[Telegram] Announcement message edited");
        }
      } catch (tgErr) {
        console.error("[Telegram] Error updating announcement message:", tgErr.message);
      }
    }

    const updated = await prisma.announcement.update({
      where: { id: parseInt(id) },
      data: {
        title,
        announcement,
        dates: parsedDates || null,
        target_employee_ids: parsedTargetIds || null,
        image_path,
        telegram_message_id: newTelegramMessageId,
        updated_at: new Date(),
      },
    });

    res.status(200).json({
      result: true,
      message: "Announcement updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("[Announcement Controller] Update Error:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

