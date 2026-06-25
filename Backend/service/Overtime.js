import prisma from "../lib/prisma.js";
import { createNotification, notifyAdmins, notifyManager } from "./Notification.js";
import { formatICTDateTime } from "../utils/timezone.js";

// Helper function to update overtime message on Telegram
const updateOvertimeMessage = async (overtime, newStatus) => {
  try {
    if (overtime.telegram_message_id && overtime.telegram_chat_id) {
      const { editDecisionMessage } = await import("./TelegramApproval.js");
      const employee = await prisma.employee.findUnique({
        where: { id: overtime.employee_id },
        include: {
          department_employee_department_idTodepartment: true,
          company: true,
        },
      });

      let managerName = "Not Assigned";
      if (employee?.department_employee_department_idTodepartment?.manager_id) {
        const manager = await prisma.employee.findUnique({
          where: { id: employee.department_employee_department_idTodepartment.manager_id },
        });
        managerName = manager ? `${manager.first_name} ${manager.last_name}` : "Not Assigned";
      }

      const start = overtime.start_date;
      const end = overtime.end_date;

      const updatedMessage =
        `📋 <b>Overtime Request</b>\n\n` +
        `👤 <b>Employee:</b> ${employee.first_name} ${employee.last_name}\n` +
        `🏢 <b>Department:</b> ${employee.department_employee_department_idTodepartment?.name || 'N/A'}\n` +
        `📍 <b>Position:</b> ${employee.positions?.name || 'N/A'}\n` +
        `👔 <b>Manager:</b> ${managerName}\n\n` +
        `⏰ <b>From:</b> ${formatICTDateTime(start)}\n` +
        `⏰ <b>To:</b> ${formatICTDateTime(end)}\n` +
        `📝 <b>Reason:</b> ${overtime.reason || 'No reason provided'}\n\n` +
        `Status: ${newStatus}\n\n` +
        `<i>ID: ${overtime.id}</i>`;

      await editDecisionMessage(
        employee?.company?.telegram_bot_token,
        overtime.telegram_chat_id,
        overtime.telegram_message_id,
        updatedMessage
      );
    }
  } catch (error) {
    console.error("Error updating overtime message:", error);
  }
};

export const createOvertime = async (employee_id, start_date, end_date, reason, company_id) => {
  try {
    // Validate dates: start date must be in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of today to compare dates only
    
    // For overtime, start_date might be a full ISO string, so handle both cases
    let startDate;
    let endDate;
    
    if (start_date.includes('T')) {
      // If it's a full ISO string, use as is
      startDate = new Date(start_date);
    } else {
      // If it's just YYYY-MM-DD, parse in local time
      const [startYear, startMonth, startDay] = start_date.split('-').map(Number);
      startDate = new Date(startYear, startMonth - 1, startDay);
    }
    
    const checkStartDate = new Date(startDate);
    checkStartDate.setHours(0, 0, 0, 0);

    if (checkStartDate <= today) {
      throw new Error("Overtime start date must be a future date (cannot be today or earlier)");
    }

    // Validate end date is not before start date
    if (end_date.includes('T')) {
      endDate = new Date(end_date);
    } else {
      const [endYear, endMonth, endDay] = end_date.split('-').map(Number);
      endDate = new Date(endYear, endMonth - 1, endDay);
    }
    
    if (endDate < startDate) {
      throw new Error("End time cannot be before start time");
    }

    // Check for overlapping overtime requests
    const existingOvertimes = await prisma.overtime.findMany({
      where: {
        employee_id: parseInt(employee_id),
        status: { notIn: ["rejected"] }, // Exclude rejected overtimes
      },
    });

    for (const overtime of existingOvertimes) {
      const existingStart = new Date(overtime.start_date);
      const existingEnd = new Date(overtime.end_date);

      // Check for overlap
      if (!(endDate <= existingStart || startDate >= existingEnd)) {
        throw new Error("You already have an overtime request that overlaps with these times");
      }
    }

    // First create the overtime record to get an ID
    const newOvertime = await prisma.overtime.create({
      data: {
        employee_id: parseInt(employee_id),
        start_date: startDate,
        end_date: endDate,
        reason: reason,
      },
    });

    // Get employee details
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employee_id) },
      include: {
        department_employee_department_idTodepartment: true,
        positions: true,
        company: true,
      },
    });

    // Send Database & Socket.io notifications
    try {
      const fullName = `${employee.first_name} ${employee.last_name}`.trim();
      const title = "New Overtime Request";
      const body = `${fullName} requested overtime for ${startDate.toLocaleDateString()}.`;
      await notifyManager(employee_id, title, body, newOvertime.id);
      await notifyAdmins(company_id, title, body, newOvertime.id);
    } catch (e) {
      console.error("[Overtime Notification Error]", e.message);
    }

    let managerName = "Not Assigned";
    if (employee?.department_employee_department_idTodepartment?.manager_id) {
      const manager = await prisma.employee.findUnique({
        where: { id: employee.department_employee_department_idTodepartment.manager_id },
      });
      managerName = manager ? `${manager.first_name} ${manager.last_name}` : "Not Assigned";
    }

    let messageId = null;
    let chatId = null;

    // Send Telegram message to group
    const activeGroupId = employee?.company?.telegram_overtime_group_id || employee?.company?.telegram_group_id;
    if (activeGroupId) {
      try {
        const { sendTelegramMessage } = await import("./Telegram.js");
        
        const message =
          `📋 <b>New Overtime Request</b>\n\n` +
          `👤 <b>Employee:</b> ${employee.first_name} ${employee.last_name}\n` +
          `🏢 <b>Department:</b> ${employee.department_employee_department_idTodepartment?.name || 'N/A'}\n` +
          `📍 <b>Position:</b> ${employee.positions?.name || 'N/A'}\n` +
          `👔 <b>Manager:</b> ${managerName}\n\n` +
          `⏰ <b>From:</b> ${formatICTDateTime(startDate)}\n` +
          `⏰ <b>To:</b> ${formatICTDateTime(endDate)}\n` +
          `📝 <b>Reason:</b> ${reason || 'No reason provided'}\n\n` +
          `<i>Status: Pending for approval</i>`;

        const result = await sendTelegramMessage(
          employee?.company?.telegram_bot_token,
          activeGroupId,
          message,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "✅ Approve",
                    callback_data: `approve_overtime_${newOvertime.id}`,
                  },
                  {
                    text: "❌ Reject",
                    callback_data: `reject_overtime_${newOvertime.id}`,
                  },
                ],
              ],
            },
          }
        );
        
        // Store message ID and chat ID
        if (result && result !== false) {
          messageId = result.result?.message_id;
          chatId = activeGroupId;
          
          // Update the overtime record with the message and chat IDs
          await prisma.overtime.update({
            where: { id: newOvertime.id },
            data: {
              telegram_message_id: messageId,
              telegram_chat_id: chatId,
            },
          });
        }
        
        console.log("Overtime request sent to group");
      } catch (tgError) {
        console.error("Error sending overtime request:", tgError.message);
      }
    }

    return { 
      result: true, 
      message: "Overtime request created successfully",
      id: newOvertime.id
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getMyOvertimes = async (employee_id) => {
  try {
    const overtimes = await prisma.overtime.findMany({
      where: {
        employee_id: parseInt(employee_id),
      },
      include: {
        employee_overtime_employee_idToemployee: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });
    return {
      result: true,
      message: "Overtime records retrieved successfully",
      data: overtimes,
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getPendingOvertimesForManager = async (manager_employee_id, company_id) => {
  try {
    const manager = await prisma.employee.findUnique({
      where: { id: parseInt(manager_employee_id) },
      include: { role: true },
    });

    const roleName = manager?.role?.name?.toLowerCase() || '';
    const isAdmin = roleName === 'admin' || roleName === 'superadmin' || roleName.includes('hr');

    const pendingOvertimes = await prisma.overtime.findMany({
      where: {
        status: "pending",
        employee_overtime_employee_idToemployee: {
          company_id: parseInt(company_id),
          id: { not: parseInt(manager_employee_id) },
          ...(isAdmin ? {} : {
            department_employee_department_idTodepartment: {
              manager_id: parseInt(manager_employee_id),
            },
          }),
        },
      },
      include: {
        employee_overtime_employee_idToemployee: {
          include: {
            department_employee_department_idTodepartment: true,
            positions: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });
    return pendingOvertimes;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getAllOvertimes = async (company_id, department_id = null) => {
  try {
    const where = {
      employee_overtime_employee_idToemployee: {
        company_id: parseInt(company_id),
      },
    };

    if (department_id) {
      where.employee_overtime_employee_idToemployee.department_id = parseInt(department_id);
    }

    const overtimes = await prisma.overtime.findMany({
      where,
      include: {
        employee_overtime_employee_idToemployee: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });
    return overtimes;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const approveOvertime = async (id, approved_by) => {
  try {
    const overtime = await prisma.overtime.findUnique({
      where: { id: parseInt(id) },
    });

    if (!overtime || overtime.status !== "pending") {
      return { 
        result: false, 
        message: "Invalid or already processed overtime request" 
      };
    }

    const updatedOvertime = await prisma.overtime.update({
      where: { id: parseInt(id) },
      data: {
        status: "approved",
        approved_by: parseInt(approved_by),
      },
      include: {
        employee_overtime_employee_idToemployee: true
      }
    });

    // Send real-time notification to requesting employee
    try {
      const empUser = await prisma.user.findFirst({
        where: { employee_id: updatedOvertime.employee_id }
      });
      if (empUser) {
        const approver = await prisma.employee.findUnique({ where: { id: parseInt(approved_by) } });
        const approverName = approver ? `${approver.first_name} ${approver.last_name}` : "Manager";
        const title = "Overtime Request Approved";
        const body = `Your overtime request for ${new Date(updatedOvertime.start_date).toLocaleDateString()} has been approved by ${approverName}.`;
        await createNotification(updatedOvertime.employee_overtime_employee_idToemployee.company_id, title, body, empUser.id, updatedOvertime.id);
      }
    } catch (e) {
      console.error("[Overtime Approval Notification Error]", e.message);
    }

    // Update the Telegram message
    await updateOvertimeMessage(overtime, "✅ <b>Approved</b>");

    return { result: true, message: "Overtime request approved successfully" };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const rejectOvertime = async (id, approved_by) => {
  try {
    const overtime = await prisma.overtime.findUnique({
      where: { id: parseInt(id) },
    });

    if (!overtime) {
      return { 
        result: false, 
        message: "Invalid overtime request" 
      };
    }

    const updatedOvertime = await prisma.overtime.update({
      where: { id: parseInt(id) },
      data: {
        status: "rejected",
        approved_by: parseInt(approved_by),
      },
      include: {
        employee_overtime_employee_idToemployee: true
      }
    });

    // Send real-time notification to requesting employee
    try {
      const empUser = await prisma.user.findFirst({
        where: { employee_id: updatedOvertime.employee_id }
      });
      if (empUser) {
        const rejecter = await prisma.employee.findUnique({ where: { id: parseInt(approved_by) } });
        const rejecterName = rejecter ? `${rejecter.first_name} ${rejecter.last_name}` : "Manager";
        const title = "Overtime Request Rejected";
        const body = `Your overtime request for ${new Date(updatedOvertime.start_date).toLocaleDateString()} has been rejected by ${rejecterName}.`;
        await createNotification(updatedOvertime.employee_overtime_employee_idToemployee.company_id, title, body, empUser.id, updatedOvertime.id);
      }
    } catch (e) {
      console.error("[Overtime Rejection Notification Error]", e.message);
    }

    // Update the Telegram message
    await updateOvertimeMessage(overtime, "❌ <b>Rejected</b>");

    return { result: true, message: "Overtime request rejected successfully" };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const cancelOvertime = async (overtime_id, employee_id) => {
  try {
    const overtime = await prisma.overtime.findUnique({
      where: { id: parseInt(overtime_id) },
      include: {
        employee_overtime_employee_idToemployee: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!overtime) {
      throw new Error("Overtime record not found");
    }

    if (overtime.employee_id !== parseInt(employee_id)) {
      throw new Error("You can only cancel your own overtime requests");
    }

    if (overtime.status !== "pending") {
      throw new Error("Only pending overtime requests can be cancelled");
    }

    // Update overtime status
    await prisma.overtime.update({
      where: { id: parseInt(overtime_id) },
      data: {
        status: "rejected",
      },
    });

    // Delete Telegram message
    if (overtime.telegram_message_id && overtime.telegram_chat_id) {
      try {
        const { deleteTelegramMessage } = await import("./Telegram.js");
        const botToken = overtime.employee_overtime_employee_idToemployee?.company?.telegram_bot_token;
        if (botToken) {
          await deleteTelegramMessage(botToken, String(overtime.telegram_chat_id), overtime.telegram_message_id);
        }
      } catch (tgError) {
        console.error("Error deleting Telegram message for cancelled overtime:", tgError.message);
      }
    }

    // Delete system notifications
    try {
      await prisma.notification.deleteMany({
        where: {
          reference_id: parseInt(overtime_id),
          title: "New Overtime Request",
        },
      });
    } catch (notifError) {
      console.error("Error deleting notification for cancelled overtime:", notifError.message);
    }

    return { result: true, message: "Overtime request cancelled successfully" };
  } catch (error) {
    console.error("Error cancelling overtime:", error);
    throw error;
  }
};
