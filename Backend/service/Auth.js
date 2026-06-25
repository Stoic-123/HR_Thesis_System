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
            department_employee_department_idTodepartment: {
              select: {
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

      employee: {
        id: getMeResult.employee.id,
        company_id: getMeResult.employee.company_id,
        first_name: getMeResult.employee.first_name,
        last_name: getMeResult.employee.last_name,
        email: getMeResult.employee.email,
        age: getMeResult.employee.age,
        gender: getMeResult.employee.gender,
        role: getMeResult.employee.role?.name,
        permissions: getMeResult.employee.role?.rolebaseaccess
          ? getMeResult.employee.role.rolebaseaccess.map((p) => p.path)
          : [],
        department:
          getMeResult.employee.department_employee_department_idTodepartment
            ?.name,

        position: getMeResult.employee.positions?.name,
        profile_path: getMeResult.employee.profile_path,
        company: getMeResult.employee.company,
        location: getMeResult.employee.employeelocation.map(
          (loc) => loc.location.name,
        ),
        is_manager: managedDepartments.length > 0,
        managed_departments: managedDepartments,
      },
    };
    return formattedUser;
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};


export const forgotPassword = async (username) => {
  try {
    console.log(`[Forgot Password] Processing request for username: ${username}`);
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

    // Find the department manager first
    const department = user.employee.department_employee_department_idTodepartment;
    const departmentManager = department?.employee_department_manager_idToemployee;
    console.log(`[Forgot Password] Found department manager:`, departmentManager ? `${departmentManager.first_name} ${departmentManager.last_name}` : 'none');
    if (departmentManager) {
      console.log(`[Forgot Password] Department manager chat ID: ${departmentManager.telegram_chat_id}`);
    }

    // Also find HR/Admin in the same company as backup
    const hrUsers = await prisma.user.findMany({
      where: {
        employee: {
          company_id: user.employee.company_id,
          OR: [
            {
              role: {
                name: {
                  in: [
                    "Admin", "admin",
                    "HR", "hr",
                    "HR Manager", "hr manager",
                    "Human Resource", "human resource",
                    "Human Resources", "human resources"
                  ],
                },
              },
            },
            {
              department_employee_department_idTodepartment: {
                name: {
                  in: [
                    "HR", "hr",
                    "Human Resource", "human resource",
                    "Human Resources", "human resources"
                  ],
                },
              },
            },
          ],
        },
      },
      include: {
        employee: true,
      },
    });
    console.log(`[Forgot Password] Found ${hrUsers.length} HR/Admin users`);
    for (const hrUser of hrUsers) {
      console.log(`[Forgot Password] HR/Admin user ${hrUser.employee.first_name} ${hrUser.employee.last_name} - chat ID: ${hrUser.employee.telegram_chat_id}`);
    }

    const company = user.employee.company;
    const botToken = company.telegram_bot_token;
    console.log(`[Forgot Password] Bot token available: ${!!botToken}`);

    // Build message for HR/Manager
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

    // Collect all chat IDs to send direct messages
    const chatIds = [];
    const userRole = user.employee?.role?.name;

    if (userRole === "Admin" || userRole === "admin") {
      // Admin requests reset -> Send direct to their own telegram_chat_id only
      if (user.employee?.telegram_chat_id) {
        chatIds.push(user.employee.telegram_chat_id);
      }
    } else {
      // Normal employee or manager requests reset -> Send to HR managers/admins
      if (departmentManager?.telegram_chat_id) {
        chatIds.push(departmentManager.telegram_chat_id);
      }
      hrUsers.forEach(hrUser => {
        const chatId = hrUser.employee?.telegram_chat_id;
        if (chatId && hrUser.id !== user.id && !chatIds.includes(chatId)) {
          chatIds.push(chatId);
        }
      });
    }

    console.log(`[Forgot Password] Collected ${chatIds.length} chat IDs to send to:`, chatIds);

    if (chatIds.length === 0) {
      console.log(`[Forgot Password] No direct Telegram chat IDs found for reset request of ${username}`);
      return {
        result: false,
        message: "No registered HR or Admin Telegram chat found to process your request.",
      };
    }

    // Send direct messages to all recipients
    if (botToken) {
      for (const chatId of chatIds) {
        try {
          console.log(`[Forgot Password] Sending message to chat ID: ${chatId}`);
          await sendTelegramMessage(botToken, chatId, msg, {
            reply_markup: keyboard,
          });
          console.log(`[Forgot Password] Sent direct message to chat ID: ${chatId}`);
        } catch (e) {
          console.error(`[Forgot Password] Error sending to chat ID ${chatId}:`, e.message);
        }
      }
    } else {
      console.log(`[Forgot Password] No bot token available for company`);
      return {
        result: false,
        message: "Telegram bot token is not configured for this company.",
      };
    }

    return {
      result: true,
      message: "Password reset request sent successfully.",
    };
  } catch (error) {
    console.error(`[Forgot Password] Error processing request:`, error.message);
    throw error;
  }
};

export const resetPasswordToDefault = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
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

    const defaultPassword = "Hr12345";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await prisma.user.update({
      where: { id: parseInt(userId) },
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
    const botToken = company.telegram_bot_token;

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
  }
};
