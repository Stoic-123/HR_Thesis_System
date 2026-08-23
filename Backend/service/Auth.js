import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { sendTelegramMessage } from "./Telegram.js";

export const employeeChecker = async (username) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};

export const changePassword = async (
  user_id,
  current_password,
  new_password
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: user_id },
    });

    if (!user) {
      return {
        result: false,
        message: "User not found.",
      };
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      current_password,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return {
        result: false,
        message: "Current password is incorrect.",
      };
    }

    const hashedNewPassword = await bcrypt.hash(new_password, 10);

    await prisma.user.update({
      where: { id: user_id },
      data: {
        password: hashedNewPassword,
        is_default_password: false,
        token_version: {
          increment: 1,
        },
      },
    });

    return {
      result: true,
      message: "Password changed successfully.",
    };
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};
export const employeeRoleChecker = async (username) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return "No Role";
    }
    const employee_id = user.employee_id;
    if (!employee_id) return "No Role";

    const employee = await prisma.employee.findUnique({
      where: {
        id: employee_id,
      },
      select: { role_id: true }
    });

    if (!employee || !employee.role_id) {
      return "No Role";
    }

    const employee_role = await prisma.role.findUnique({
      where: {
        id: employee.role_id,
      },
    });
    return employee_role ? employee_role.name : "No Role";
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};
export const getCompanyID = async (employee_id) => {
  try {
    if (!employee_id) {
      return null;
    }
    const employee = await prisma.employee.findUnique({
      where: { id: employee_id },
      select: {
        company_id: true,
      },
    });

    if (!employee) {
      return null;
    }

    return employee.company_id;
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};
export const InvalidateToken = async (user_id) => {
  try {
    await prisma.user.update({
      where: { id: user_id },
      data: {
        token_version: {
          increment: 1,
        },
      },
    });

    return {
      result: true,
      message: "Invalidate token successfully..!",
    };
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};
export const getMe = async (user_id) => {
  try {
    const getMeResult = await prisma.user.findUnique({
      where: {
        id: user_id,
      },

      select: {
        id: true,
        username: true,

        employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            age: true,
            gender: true,
            phone_number1: true,
            phone_number2: true,
            address: true,
            telegram_username: true,
            company_id: true,
            profile_path: true,
            company: {
              select: {
                id: true,
                name: true,
                primary_color: true,
                secondary_color: true,
                logo_path: true,
              },
            },
            department_id: true,
            department_employee_department_idTodepartment: {
              select: {
                id: true,
                name: true,
              },
            },

            positions: {
              select: {
                name: true,
              },
            },
            role: {
              select: {
                name: true,
                rolebaseaccess: {
                  select: {
                    path: true,
                    path_name: true,
                  },
                },
              },
            },
            employeelocation: {
              select: {
                location: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            document: {
              select: {
                id: true,
                document_type_id: true,
                document_path: true,
                uploaded_at: true,
                documenttype: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Check if employee is a manager of any department
    const managedDepartments = getMeResult.employee ? await prisma.department.findMany({
      where: { manager_id: getMeResult.employee.id },
      select: { id: true, name: true },
    }) : [];

    const formattedUser = {
      id: getMeResult.id,
      username: getMeResult.username,

      employee: getMeResult.employee
        ? {
            id: getMeResult.employee.id,
            company_id: getMeResult.employee.company_id,
            first_name: getMeResult.employee.first_name,
            last_name: getMeResult.employee.last_name,
            email: getMeResult.employee.email,
            age: getMeResult.employee.age,
            gender: getMeResult.employee.gender,
            phone_number: getMeResult.employee.phone_number1,
            phone_number1: getMeResult.employee.phone_number1,
            phone_number2: getMeResult.employee.phone_number2,
            address: getMeResult.employee.address,
            telegram_username: getMeResult.employee.telegram_username,
            role: getMeResult.employee.role?.name || "Admin",
            permissions: getMeResult.employee.role?.rolebaseaccess
              ? getMeResult.employee.role.rolebaseaccess.map((p) => p.path)
              : [],
            department:
              getMeResult.employee.department_employee_department_idTodepartment
                ?.name,
            position: getMeResult.employee.positions?.name,
            profile_path: getMeResult.employee.profile_path,
            company: getMeResult.employee.company,
            location: getMeResult.employee.employeelocation
              ? getMeResult.employee.employeelocation.map((loc) => loc.location.name)
              : [],
            documents: getMeResult.employee.document?.map((doc) => ({
              id: doc.id,
              document_type_id: doc.document_type_id,
              document_type_name: doc.documenttype?.name || "Document",
              document_path: doc.document_path,
              uploaded_at: doc.uploaded_at,
            })) || [],
            is_manager: managedDepartments.length > 0,
            managed_departments: managedDepartments,
          }
        : {
            id: 0,
            company_id: 1,
            first_name: getMeResult.username,
            last_name: "",
            email: "",
            phone_number: "",
            phone_number1: "",
            phone_number2: "",
            address: "",
            telegram_username: "",
            gender: "other",
            role: "Admin",
            permissions: ["*"],
            department: "Administration",
            position: "Administrator",
            profile_path: null,
            company: null,
            location: [],
            documents: [],
            is_manager: false,
            managed_departments: [],
          },
    };
    return formattedUser;
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};


const forgotPasswordCooldowns = new Map();

export const forgotPassword = async (username) => {
  try {
    console.log(`[Forgot Password] Processing request for username: ${username}`);

    // Anti-Spam: 60-second cooldown per username to protect HR Manager from Telegram spam
    const now = Date.now();
    const lastRequest = forgotPasswordCooldowns.get(username.toLowerCase());
    if (lastRequest && now - lastRequest < 60000) {
      const waitSeconds = Math.ceil((60000 - (now - lastRequest)) / 1000);
      return {
        result: false,
        message: `A reset request was already sent recently. Please wait ${waitSeconds}s before requesting again.`,
      };
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        employee: {
          include: {
            role: true,
            department_employee_department_idTodepartment: {
              include: {
                employee_department_manager_idToemployee: true,
              },
            },
            company: true,
          },
        },
      },
    });

    if (!user) {
      console.log(`[Forgot Password] User not found for username: ${username}`);
      return {
        result: false,
        message: "User not found.",
      };
    }

    if (!user.employee) {
      console.log(`[Forgot Password] User ${username} is not associated with an employee record`);
      return {
        result: false,
        message: "This user is not associated with an employee record.",
      };
    }

    // Set cooldown timestamp after confirming valid user
    forgotPasswordCooldowns.set(username.toLowerCase(), now);

    // Find all HR Managers / HR Department staff / Admins in the company (Centralized HR Model)
    let hrManagers = await prisma.user.findMany({
      where: {
        employee: {
          company_id: user.employee.company_id,
          is_active: "active",
          OR: [
            {
              role: {
                name: {
                  in: [
                    "HR Manager", "hr manager", "HR manager", "Hr Manager", "HR MANAGER",
                    "Head of HR", "head of hr", "HR Director", "hr director", "HR Lead", "hr lead",
                    "HR", "hr", "Hr", "Human Resource", "human resource", "Human Resources", "human resources",
                    "HR Officer", "hr officer", "HR Executive", "hr executive",
                    "Admin", "admin", "Super Admin", "super admin", "SuperAdmin", "ADMIN"
                  ],
                },
              },
            },
            {
              department_employee_department_idTodepartment: {
                name: {
                  in: [
                    "Human Resource", "human resource", "Human Resources", "human resources",
                    "HR", "hr", "HR Department", "hr department"
                  ],
                },
              },
            },
          ],
        },
      },
      include: {
        employee: {
          include: {
            role: true,
            department_employee_department_idTodepartment: true,
          },
        },
      },
    });

    console.log(`[Forgot Password] Found ${hrManagers.length} HR/Admin recipient user(s)`);
    for (const hrUser of hrManagers) {
      console.log(`[Forgot Password] HR/Admin ${hrUser.employee.first_name} ${hrUser.employee.last_name} - chat ID: ${hrUser.employee.telegram_chat_id}`);
    }

    const company = user.employee.company;
    const botToken = company.telegram_bot_token;
    console.log(`[Forgot Password] Bot token available: ${!!botToken}`);

    // Build message for HR Manager
    const department = user.employee.department_employee_department_idTodepartment;
    const employeeName = `${user.employee.first_name} ${user.employee.last_name}`;
    let msg = "🔐 <b>Password Reset Request</b>\n";
    msg += "━━━━━━━━━━━━━━━━━\n";
    msg += `👤 <b>Employee:</b> ${employeeName}\n`;
    msg += `📋 <b>Username:</b> ${username}\n`;
    if (department) {
      msg += `🏢 <b>Department:</b> ${department.name}\n`;
    }
    msg += `📅 <b>Date:</b> ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}\n`;
    msg += `⏰ <b>Time:</b> ${new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}\n`;
    msg += "━━━━━━━━━━━━━━━━━\n";
    msg += "Please reset this employee's password to default!";

    // Create inline keyboard with reset button
    const keyboard = {
      inline_keyboard: [[
        { text: 'Reset Password 🔐', callback_data: `resetpassword_${user.id}` },
      ]],
    };

    // Collect HR Manager chat IDs and usernames
    const chatIds = [];
    const hrUsernames = [];

    hrManagers.forEach((hrUser) => {
      const chatId = hrUser.employee?.telegram_chat_id;
      const username = hrUser.employee?.telegram_username?.replace(/^@/, "").trim();
      if (chatId && hrUser.id !== user.id && !chatIds.includes(chatId)) {
        chatIds.push(chatId);
      }
      if (username && !hrUsernames.includes(username)) {
        hrUsernames.push(username);
      }
    });

    console.log(`[Forgot Password] Found ${hrManagers.length} HR manager(s), ${chatIds.length} DM chat ID(s), ${hrUsernames.length} username(s)`);

    if (!botToken) {
      console.log(`[Forgot Password] No bot token available for company`);
      return {
        result: false,
        message: "Telegram bot token is not configured for this company.",
      };
    }

    let sentCount = 0;

    // 1. Send direct messages to all HR Managers with registered chat IDs
    for (const chatId of chatIds) {
      try {
        console.log(`[Forgot Password] Sending DM to chat ID: ${chatId}`);
        await sendTelegramMessage(botToken, chatId, msg, {
          reply_markup: keyboard,
        });
        sentCount++;
      } catch (e) {
        console.error(`[Forgot Password] Error sending to chat ID ${chatId}:`, e.message);
      }
    }

    // 2. Fallback: If no direct DMs were sent, post to company Telegram group tagging the HR Managers
    const groupId = company.telegram_group_id || company.telegram_attendance_group_id;
    if (sentCount === 0 && groupId) {
      const mentions = hrUsernames.map((u) => `@${u}`).join(" ");
      const groupMsg = msg + (mentions ? `\n👔 <b>To HR:</b> ${mentions}` : "");

      try {
        console.log(`[Forgot Password] Fallback: Sending to Telegram group: ${groupId}`);
        await sendTelegramMessage(botToken, groupId, groupMsg, {
          reply_markup: keyboard,
        });
        sentCount++;
      } catch (e) {
        console.error(`[Forgot Password] Error sending to group ${groupId}:`, e.message);
      }
    }

    if (sentCount === 0) {
      return {
        result: false,
        message: "Could not deliver reset request to HR Manager Telegram. Please ensure HR Manager has started the Telegram bot.",
      };
    }

    return {
      result: true,
      message: "Password reset request sent to HR Manager(s) successfully.",
    };
  } catch (error) {
    console.error(`[Forgot Password] Error processing request:`, error.message);
    throw error;
  }
};

const activeResetLocks = new Map();

export const resetPasswordToDefault = async (userId) => {
  const numUserId = parseInt(userId);
  if (activeResetLocks.has(numUserId)) {
    console.log(`[Reset Password] Coalescing duplicate request for userId: ${numUserId}`);
    return activeResetLocks.get(numUserId);
  }

  const resetPromise = (async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: numUserId },
        include: {
          employee: {
            include: {
              company: true,
            },
          },
        },
      });

      if (!user) {
        return {
          result: false,
          message: "User not found.",
        };
      }

      const defaultPassword = user.employee?.company?.default_password || "Hr12345";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await prisma.user.update({
        where: { id: numUserId },
        data: {
          password: hashedPassword,
          is_default_password: true,
          token_version: {
            increment: 1,
          },
        },
      });

      // Send confirmation message to Telegram
      const company = user.employee.company;
      const botToken = company?.telegram_bot_token;

      // Build message
      const employeeName = `${user.employee.first_name} ${user.employee.last_name}`;
      let employeeMsg = "✅ <b>Your Password Has Been Reset</b>\n";
      employeeMsg += "━━━━━━━━━━━━━━━━━\n";
      employeeMsg += `👤 <b>Employee:</b> ${employeeName}\n`;
      employeeMsg += `📋 <b>Username:</b> ${user.username}\n`;
      employeeMsg += `🔑 <b>New Default Password:</b> ${defaultPassword}\n`;
      employeeMsg += "━━━━━━━━━━━━━━━━━\n";
      employeeMsg += "⚠️ Please change your password after logging in!";

      // Send direct message to employee if chat ID exists
      if (botToken && user.employee.telegram_chat_id) {
        try {
          await sendTelegramMessage(botToken, user.employee.telegram_chat_id, employeeMsg);
          console.log(`[Reset Password] Sent direct message to employee ${userId}`);
        } catch (e) {
          console.error(`[Reset Password] Error sending to employee:`, e.message);
        }
      }

      return {
        result: true,
        message: "Password reset to default successfully.",
      };
    } catch (error) {
      console.error(error.message);
      throw error;
    } finally {
      setTimeout(() => {
        activeResetLocks.delete(numUserId);
      }, 4000);
    }
  })();

  activeResetLocks.set(numUserId, resetPromise);
  return resetPromise;
};

export const resetPassword = resetPasswordToDefault;
