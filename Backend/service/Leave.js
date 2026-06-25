import prisma from "../lib/prisma.js";
import { sendTelegramMessage } from "./Telegram.js";
import { sendApprovalRequest, editDecisionMessage } from "./TelegramApproval.js";
import path from "path";
import { createNotification, notifyAdmins, notifyManager } from "./Notification.js";
import { formatICTDate } from "../utils/timezone.js";

// Helper function to group dates into consecutive ranges
const groupDatesIntoRanges = (dates) => {
  if (!dates.length) return [];
  
  // Sort dates first
  const sortedDates = [...dates].sort((a, b) => new Date(a) - new Date(b));
  const ranges = [];
  let currentRange = [sortedDates[0]];
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(currentRange[currentRange.length - 1]);
    const currDate = new Date(sortedDates[i]);
    
    // Check if current date is next day after previous
    prevDate.setDate(prevDate.getDate() + 1);
    
    if (prevDate.toDateString() === currDate.toDateString()) {
      // Consecutive, add to current range
      currentRange.push(sortedDates[i]);
    } else {
      // Not consecutive, start new range
      ranges.push([...currentRange]);
      currentRange = [sortedDates[i]];
    }
  }
  
  ranges.push([...currentRange]);
  return ranges;
};

export const CreateNewLeave = async (
  employee_id,
  leave_type_id,
  dates, // Array of date strings (YYYY-MM-DD)
  reason,
  photo_path = null,
) => {
  try {
    // Validate dates: all must be in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parsedDates = dates.map(dateStr => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);
      return date;
    });

    for (const date of parsedDates) {
      if (date <= today) {
        throw new Error("All leave dates must be future dates (cannot be today or earlier)");
      }
    }

    // Check for overlapping leave requests
    const existingLeaves = await prisma.leaverecord.findMany({
      where: {
        employee_id: parseInt(employee_id),
        status: { notIn: ["rejected"] },
      },
    });

    // Check each selected date against existing leaves
    for (const selectedDate of parsedDates) {
      for (const leave of existingLeaves) {
        const existingStartStr = leave.start_date.toISOString().split('T')[0];
        const [eStartYear, eStartMonth, eStartDay] = existingStartStr.split('-').map(Number);
        const existingStart = new Date(eStartYear, eStartMonth - 1, eStartDay);
        existingStart.setHours(0, 0, 0, 0);

        const existingEndStr = leave.end_date.toISOString().split('T')[0];
        const [eEndYear, eEndMonth, eEndDay] = existingEndStr.split('-').map(Number);
        const existingEnd = new Date(eEndYear, eEndMonth - 1, eEndDay);
        existingEnd.setHours(0, 0, 0, 0);

        if (selectedDate >= existingStart && selectedDate <= existingEnd) {
          throw new Error("You already have a leave request that overlaps with these dates");
        }
      }
    }

    // Get employee, department, manager, leave type, and company
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employee_id) },
      include: {
        department_employee_department_idTodepartment: {
          include: {
            employee_department_manager_idToemployee: true,
          },
        },
        company: true,
      },
    });

    const leaveType = await prisma.leavetype.findUnique({
      where: { id: parseInt(leave_type_id) },
    });

    // Group dates into consecutive ranges
    const dateRanges = groupDatesIntoRanges(dates);
    const leaveRecords = [];

    // Create a leave record for each range
    for (const range of dateRanges) {
      const startDate = parsedDates[dates.indexOf(range[0])];
      const endDate = parsedDates[dates.indexOf(range[range.length - 1])];

      const leaveRecord = await prisma.leaverecord.create({
        data: {
          employee_id: parseInt(employee_id),
          leave_type_id: parseInt(leave_type_id),
          start_date: startDate,
          end_date: endDate,
          reason,
          photo_path,
        },
        include: {
          leavetype: true,
          employee_leaverecord_employee_idToemployee: true,
        },
      });

      leaveRecords.push(leaveRecord);
    }

    // Send Database & Socket.io notifications
    try {
      const fullName = `${employee.first_name} ${employee.last_name}`.trim();
      const leaveTypeStr = leaveType?.name || 'Leave';
      const title = "New Leave Request";
      
      const formattedRanges = dateRanges.map(range => {
        if (range.length === 1) {
          return formatICTDate(range[0]);
        } else {
          return `${formatICTDate(range[0])} - ${formatICTDate(range[range.length - 1])}`;
        }
      }).join(', ');

      const body = `${fullName} requested ${leaveTypeStr} for ${formattedRanges}.`;
      const refId = leaveRecords[0]?.id || null;

      await notifyManager(employee_id, title, body, refId);
      await notifyAdmins(employee.company_id, title, body, refId);
    } catch (e) {
      console.error("[Leave Notification Error]", e.message);
    }

    // Send Telegram message to manager
    if (employee?.company?.telegram_bot_token && leaveRecords.length > 0) {
      const fullName = `${employee.first_name} ${employee.last_name}`.trim();
      const manager = employee.department_employee_department_idTodepartment?.employee_department_manager_idToemployee;
      const botToken = employee.company.telegram_bot_token;
      
      // Format ranges for message
      const formattedRanges = dateRanges.map(range => {
        if (range.length === 1) {
          return formatICTDate(range[0]);
        } else {
          return `${formatICTDate(range[0])} - ${formatICTDate(range[range.length - 1])}`;
        }
      }).join(', ');

      // Build message
      const managerUsername = manager?.telegram_username;
      let message = `📅 <b>Leave Request</b>\n`;
      message += `━━━━━━━━━━━━━━━━━━\n`;
      message += `👤 <b>Employee:</b> ${fullName}\n`;
      message += `📋 <b>Leave Type:</b> ${leaveType?.name || 'Leave'}\n`;
      message += `📅 <b>Dates:</b> ${formattedRanges}\n`;
      message += `⏱️ <b>Total Days:</b> ${dates.length}\n`;
      if (reason) {
        message += `💬 <b>Reason:</b> ${reason}\n`;
      }
      if (managerUsername) {
        message += `👔 <b>Manager:</b> @${managerUsername.replace(/^@/, '')}\n`;
      }
      message += `━━━━━━━━━━━━━━━━━━\n`;
      message += `Please review this leave request`;

      // Create inline keyboard with all leave record IDs
      const leaveIds = leaveRecords.map(r => r.id);
      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: '✅ Approve', callback_data: `approve_leave_${JSON.stringify(leaveIds)}` },
            { text: '❌ Reject', callback_data: `reject_leave_${JSON.stringify(leaveIds)}` }
          ]
        ]
      };

      const absolutePhotoPath = photo_path ? path.join(process.cwd(), 'public', photo_path.replace(/^\/+/, '')) : null;
      let targetChatId = null;
      let messageId = null;

      // Always send leave request to the group
      const activeGroupId = employee.company.telegram_leave_group_id || employee.company.telegram_group_id;
      if (activeGroupId) {
        targetChatId = activeGroupId;
        try {
          let tgResult;
          if (absolutePhotoPath) {
            const { sendTelegramPhoto } = await import("./Telegram.js");
            tgResult = await sendTelegramPhoto(botToken, activeGroupId, absolutePhotoPath, message, {
              reply_markup: inlineKeyboard
            });
          } else {
            tgResult = await sendTelegramMessage(botToken, activeGroupId, message, {
              reply_markup: inlineKeyboard
            });
          }
          // Check if tgResult is not false and has result.message_id
          if (tgResult && tgResult !== false) {
            messageId = tgResult.result?.message_id;
          }
          console.log(`Leave request sent to group`);
        } catch (tgErr) {
          console.error('Error sending leave request to group:', tgErr.message);
        }
      }

      // Save message info to database for all leave records
      if (messageId && targetChatId) {
        for (const leaveRecord of leaveRecords) {
          await prisma.leaverecord.update({
            where: { id: leaveRecord.id },
            data: {
              telegram_message_id: messageId,
              telegram_chat_id: targetChatId,
              manager_telegram_username: managerUsername ? managerUsername.replace(/^@/, '').toLowerCase() : null,
            }
          });
        }
      }
    }

    return {
      result: true,
      message: "Request Leave Successfully.",
      data: leaveRecords,
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const GetPendingLeavesForManager = async (manager_employee_id, company_id) => {
  try {
    const manager = await prisma.employee.findUnique({
      where: { id: parseInt(manager_employee_id) },
      include: {
        role: true,
      },
    });

    if (!manager) {
      throw new Error("Manager not found");
    }

    const roleName = manager.role?.name?.toLowerCase() || '';
    const isAdmin = roleName === 'admin' || roleName === 'superadmin' || roleName.includes('hr');

    const pendingLeaves = await prisma.leaverecord.findMany({
      where: {
        status: "pending",
        employee_leaverecord_employee_idToemployee: {
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
        leavetype: true,
        employee_leaverecord_employee_idToemployee: {
          include: {
            department_employee_department_idTodepartment: true,
          },
        },
      },
      orderBy: {
        request_at: "desc",
      },
    });

    return pendingLeaves;
  } catch (error) {
    console.error("Error in GetPendingLeavesForManager:", error);
    throw error.message;
  }
};

export const GetAllLeaves = async (company_id, filters = {}) => {
  try {
    console.log("GetAllLeaves called with company_id:", company_id, "filters:", filters);
    
    const where = {
      employee_leaverecord_employee_idToemployee: {
        company_id: parseInt(company_id),
      },
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.department_id) {
      where.employee_leaverecord_employee_idToemployee.department_id = parseInt(filters.department_id);
    }

    if (filters.search) {
      const searchVal = filters.search.toLowerCase();
      where.employee_leaverecord_employee_idToemployee.OR = [
        { first_name: { contains: searchVal } },
        { last_name: { contains: searchVal } }
      ];
    }
    
    const leaves = await prisma.leaverecord.findMany({
      where,
      include: {
        leavetype: true,
        employee_leaverecord_employee_idToemployee: {
          include: {
            department_employee_department_idTodepartment: true
          }
        }
      },
      orderBy: {
        request_at: "desc"
      }
    });
    
    console.log("GetAllLeaves found leaves:", leaves.length);
    return leaves;
  } catch (error) {
    console.error("Error in GetAllLeaves:", error);
    throw error;
  }
};

// Helper function to update leave request message on Telegram
const updateLeaveMessage = async (leave, statusText) => {
  try {
    // Get employee and company info for bot token
    const leaveWithData = await prisma.leaverecord.findUnique({
      where: { id: leave.id },
      include: {
        employee_leaverecord_employee_idToemployee: {
          include: { company: true }
        },
        leavetype: true
      }
    });

    if (!leaveWithData?.telegram_message_id || !leaveWithData?.telegram_chat_id) {
      return;
    }

    const botToken = leaveWithData.employee_leaverecord_employee_idToemployee?.company?.telegram_bot_token;
    if (!botToken) {
      return;
    }

    const employee = leaveWithData.employee_leaverecord_employee_idToemployee;
    const fullName = `${employee.first_name} ${employee.last_name}`.trim();

    const newText = `📅 <b>Leave Request</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Employee:</b> ${fullName}\n` +
      `📋 <b>Leave Type:</b> ${leaveWithData.leavetype?.name || 'Leave'}\n` +
      `📅 <b>Start:</b> ${new Date(leave.start_date).toLocaleDateString()}\n` +
      `📅 <b>End:</b> ${new Date(leave.end_date).toLocaleDateString()}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      statusText;

    await editDecisionMessage(
      botToken,
      leaveWithData.telegram_chat_id,
      leaveWithData.telegram_message_id,
      newText,
      !!leaveWithData.photo_path
    );
  } catch (error) {
    console.error('Error updating leave message on Telegram:', error);
  }
};

export const ApproveLeave = async (leave_id, approved_by) => {
  try {
    // Handle case where leave_id is an array (JSON string)
    let leaveIds = [];
    if (typeof leave_id === 'string' && leave_id.startsWith('[')) {
      leaveIds = JSON.parse(leave_id);
    } else {
      leaveIds = [leave_id];
    }

    let leaveToUpdateMessageFor = null;
    
    for (const id of leaveIds) {
      // First, get the leave record to calculate days used
      const leave = await prisma.leaverecord.findUnique({
        where: { id: parseInt(id) },
        include: { leavetype: true },
      });

      if (!leave) {
        throw new Error("Leave record not found");
      }

      if (leave.status !== "pending") {
        throw new Error("Only pending leave requests can be approved");
      }

      // Calculate days between start and end date (inclusive)
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Update leave profile (used and balance) first
      const leaveProfile = await prisma.leaveprofile.findUnique({
        where: {
          employee_id_leave_type_id: {
            employee_id: leave.employee_id,
            leave_type_id: leave.leave_type_id,
          },
        },
      });

      if (leaveProfile) {
        await prisma.leaveprofile.update({
          where: {
            employee_id_leave_type_id: {
              employee_id: leave.employee_id,
              leave_type_id: leave.leave_type_id,
            },
          },
          data: {
            used: leaveProfile.used + diffDays,
            balance: leaveProfile.balance - diffDays,
          },
        });
      } else {
        // If no leave profile exists, create one
        const leaveType = await prisma.leavetype.findUnique({
          where: { id: leave.leave_type_id },
        });
        if (leaveType) {
          await prisma.leaveprofile.create({
            data: {
              employee_id: leave.employee_id,
              leave_type_id: leave.leave_type_id,
              assignment: leaveType.default_balance,
              used: diffDays,
              balance: leaveType.default_balance - diffDays,
            },
          });
        }
      }

      // Update leave status and approved_by
      const updatedLeave = await prisma.leaverecord.update({
        where: { id: parseInt(id) },
        data: {
          status: "approved",
          approved_by: parseInt(approved_by),
        },
        include: {
          leavetype: true,
          employee_leaverecord_employee_idToemployee: true,
        }
      });

      // Send real-time notification to the requesting employee
      try {
        const empUser = await prisma.user.findFirst({
          where: { employee_id: updatedLeave.employee_id }
        });
        if (empUser) {
          const approver = await prisma.employee.findUnique({ where: { id: parseInt(approved_by) } });
          const approverName = approver ? `${approver.first_name} ${approver.last_name}` : "Manager";
          const title = "Leave Request Approved";
          const body = `Your request for ${updatedLeave.leavetype?.name || 'Leave'} has been approved by ${approverName}.`;
          await createNotification(updatedLeave.employee_leaverecord_employee_idToemployee.company_id, title, body, empUser.id, updatedLeave.id);
        }
      } catch (e) {
        console.error("[Leave Approval Notification Error]", e.message);
      }

      // Save the first leave record to update the Telegram message once
      if (!leaveToUpdateMessageFor) {
        leaveToUpdateMessageFor = leave;
      }
    }

    // Update Telegram message once after all leaves are processed
    if (leaveToUpdateMessageFor) {
      await updateLeaveMessage(leaveToUpdateMessageFor, "✅ <b>Approved</b>");
    }

    return { result: true, message: "Leave approved successfully" };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const RejectLeave = async (leave_id, approved_by) => {
  try {
    // Handle case where leave_id is an array (JSON string)
    let leaveIds = [];
    if (typeof leave_id === 'string' && leave_id.startsWith('[')) {
      leaveIds = JSON.parse(leave_id);
    } else {
      leaveIds = [leave_id];
    }

    let leaveToUpdateMessageFor = null;
    
    for (const id of leaveIds) {
      // First, get the leave record to check status and calculate days
      const leave = await prisma.leaverecord.findUnique({
        where: { id: parseInt(id) },
      });

      if (!leave) {
        throw new Error("Leave record not found");
      }

      // Calculate days between start and end date (inclusive)
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // If it was previously approved, subtract days from leave profile
      if (leave.status === "approved") {
        const leaveProfile = await prisma.leaveprofile.findUnique({
          where: {
            employee_id_leave_type_id: {
              employee_id: leave.employee_id,
              leave_type_id: leave.leave_type_id,
            },
          },
        });

        if (leaveProfile) {
          await prisma.leaveprofile.update({
            where: {
              employee_id_leave_type_id: {
                employee_id: leave.employee_id,
                leave_type_id: leave.leave_type_id,
              },
            },
            data: {
              used: Math.max(0, leaveProfile.used - diffDays), // Prevent negative
              balance: leaveProfile.balance + diffDays,
            },
          });
        }
      }

      // Update leave status and approved_by
      const updatedLeave = await prisma.leaverecord.update({
        where: { id: parseInt(id) },
        data: {
          status: "rejected",
          approved_by: parseInt(approved_by),
        },
        include: {
          leavetype: true,
          employee_leaverecord_employee_idToemployee: true,
        }
      });

      // Send real-time notification to the requesting employee
      try {
        const empUser = await prisma.user.findFirst({
          where: { employee_id: updatedLeave.employee_id }
        });
        if (empUser) {
          const rejecter = await prisma.employee.findUnique({ where: { id: parseInt(approved_by) } });
          const rejecterName = rejecter ? `${rejecter.first_name} ${rejecter.last_name}` : "Manager";
          const title = "Leave Request Rejected";
          const body = `Your request for ${updatedLeave.leavetype?.name || 'Leave'} has been rejected by ${rejecterName}.`;
          await createNotification(updatedLeave.employee_leaverecord_employee_idToemployee.company_id, title, body, empUser.id, updatedLeave.id);
        }
      } catch (e) {
        console.error("[Leave Rejection Notification Error]", e.message);
      }

      // Save the first leave record to update the Telegram message once
      if (!leaveToUpdateMessageFor) {
        leaveToUpdateMessageFor = leave;
      }
    }

    // Update Telegram message once after all leaves are processed
    if (leaveToUpdateMessageFor) {
      await updateLeaveMessage(leaveToUpdateMessageFor, "❌ <b>Rejected</b>");
    }

    return { result: true, message: "Leave rejected successfully" };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const CancelLeave = async (leave_id, employee_id) => {
  try {
    // First, get the leave record to check status and ownership
    const leave = await prisma.leaverecord.findUnique({
      where: { id: parseInt(leave_id) },
      include: {
        employee_leaverecord_employee_idToemployee: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!leave) {
      throw new Error("Leave record not found");
    }

    if (leave.employee_id !== parseInt(employee_id)) {
      throw new Error("You can only cancel your own leave requests");
    }

    if (leave.status !== "pending") {
      throw new Error("Only pending leave requests can be cancelled");
    }

    // Update leave status to cancelled
    await prisma.leaverecord.update({
      where: { id: parseInt(leave_id) },
      data: {
        status: "rejected", // Or you could add a "cancelled" status, but let's use rejected for now
      },
    });

    // Delete Telegram message
    if (leave.telegram_message_id && leave.telegram_chat_id) {
      try {
        const { deleteTelegramMessage } = await import("./Telegram.js");
        const botToken = leave.employee_leaverecord_employee_idToemployee?.company?.telegram_bot_token;
        if (botToken) {
          await deleteTelegramMessage(botToken, String(leave.telegram_chat_id), leave.telegram_message_id);
        }
      } catch (tgError) {
        console.error("Error deleting Telegram message for cancelled leave:", tgError.message);
      }
    }

    // Delete system notifications
    try {
      await prisma.notification.deleteMany({
        where: {
          reference_id: parseInt(leave_id),
          title: "New Leave Request",
        },
      });
    } catch (notifError) {
      console.error("Error deleting notification for cancelled leave:", notifError.message);
    }

    return { result: true, message: "Leave cancelled successfully" };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
