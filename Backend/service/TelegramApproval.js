/**
 * TelegramApproval service
 *
 * Approval-flow for bypass-location online attendance:
 *  1. sendApprovalRequest  — sends selfie photo + APPROVE/REJECT keyboard to Telegram group
 *  2. processTelegramCallbacks (cron 5s) — polls getUpdates, validates manager, processes action
 */

import fs   from 'fs';
import path from 'path';
import prisma from '../lib/prisma.js';
import { clockAttendance } from './Attendance.js';
import { resetPasswordToDefault } from './Auth.js';
import { sendTelegramMessage } from './Telegram.js';
import { toICTDate } from '../utils/timezone.js';
import { ApproveLeave, RejectLeave } from './Leave.js';
import { approveOvertime, rejectOvertime } from './Overtime.js';

const TELEGRAM_API = 'https://api.telegram.org';

// ─── Per-bot offset tracking ─────────────────────────────────────────────────

const _offsets  = {};
const offsetKey  = (t) => t.slice(-8);
const offsetFile = (t) => path.join(process.cwd(), `.tg_offset_${offsetKey(t)}`);

const loadOffset = (token) => {
  try {
    const f = offsetFile(token);
    _offsets[token] = fs.existsSync(f) ? (parseInt(fs.readFileSync(f, 'utf8').trim()) || 0) : 0;
  } catch (_) { _offsets[token] = 0; }
};

const saveOffset = (token, offset) => {
  _offsets[token] = offset;
  try { fs.writeFileSync(offsetFile(token), String(offset)); } catch (_) {}
};

const getOffset = (token) => {
  if (_offsets[token] === undefined) loadOffset(token);
  return _offsets[token] || 0;
};

// ─── Low-level Telegram helpers ───────────────────────────────────────────────

export const tgPost = async (botToken, method, body) => {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/${method}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  return res.json();
};

/** Answer callback query — removes the spinner on the button */
export const answerCallback = async (token, cbId, text, showAlert = false) => {
  try {
    await tgPost(token, 'answerCallbackQuery', {
      callback_query_id: cbId,
      text,
      show_alert: showAlert,
    });
  } catch (_) {}
};

/** Edit message after decision. Picks caption vs text based on hasPhoto. */
export const editDecisionMessage = async (token, chatId, messageId, newText, hasPhoto) => {
  try {
    const method = hasPhoto ? 'editMessageCaption' : 'editMessageText';
    const payload = hasPhoto
      ? { chat_id: chatId, message_id: messageId, caption: newText, parse_mode: 'HTML', reply_markup: { inline_keyboard: [] } }
      : { chat_id: chatId, message_id: messageId, text:    newText, parse_mode: 'HTML', reply_markup: { inline_keyboard: [] } };
    const r = await tgPost(token, method, payload);
    if (!r?.ok) console.error('[TgApproval] editMessage failed:', r?.description);
  } catch (e) {
    console.error('[TgApproval] editMessage error:', e.message);
  }
};

// ─── Send approval request with photo + location + manager mention ────────────

export const sendApprovalRequest = async (botToken, chatId, {
  pendingId,
  employeeName,
  timeModeName,
  workAt,
  remark,
  companyName,
  absolutePhotoPath,
  latitude,
  longitude,
  managerTelegramUsername,  // without @
}) => {
  const pad = (n) => String(n).padStart(2, '0');
  const d   = toICTDate(workAt);
  const dateStr = `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
  const timeStr = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;

  // Google Maps link from coordinates
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  const locationLine = (!isNaN(lat) && !isNaN(lon))
    ? `📍 <b>ទីតាំង៖</b> <a href="https://maps.google.com/?q=${lat},${lon}">បើកផែនទី</a>\n`
    : '';

  // Mention the manager if we have their username
  const mentionLine = managerTelegramUsername
    ? `\n👔 <b>ដល់អ្នកគ្រប់គ្រង៖</b> @${managerTelegramUsername}`
    : '';

  const caption =
    `⏳ <b>សំណើវត្តមានអនឡាញ</b>\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>បុគ្គលិក៖</b> ${employeeName}\n` +
    (timeModeName ? `🕐 <b>ប្រភេទ៖</b> ${timeModeName}\n` : '') +
    `⏰ <b>ម៉ោង៖</b> ${timeStr}\n` +
    `📅 <b>កាលបរិច្ឆេទ៖</b> ${dateStr}\n` +
    locationLine +
    (remark ? `💬 <b>កំណត់ចំណាំ៖</b> ${remark}\n` : '') +
    `━━━━━━━━━━━━━━━━━\n` +
    `🏢 ${companyName || ''}` +
    mentionLine + `\n\n` +
    `<i>តែអ្នកគ្រប់គ្រងប៉ុណ្ណោះអាចអនុម័ត ឬបដិសេធបាន</i>`;

  const keyboard = {
    inline_keyboard: [[
      { text: 'អនុម័ត ✅', callback_data: `approve_${pendingId}` },
      { text: 'បដិសេធ ❌', callback_data: `reject_${pendingId}`  },
    ]],
  };

  const hasPhoto = !!absolutePhotoPath && fs.existsSync(absolutePhotoPath);

  try {
    let result;

    if (hasPhoto) {
      const boundary   = `----TgBound${Date.now()}`;
      const CRLF       = '\r\n';
      const filename   = path.basename(absolutePhotoPath);
      const fileBuffer = fs.readFileSync(absolutePhotoPath);
      const kbJson     = JSON.stringify(keyboard);

      const metaFields = [
        { name: 'chat_id',      value: String(chatId) },
        { name: 'caption',      value: caption },
        { name: 'parse_mode',   value: 'HTML' },
        { name: 'reply_markup', value: kbJson },
      ];

      const parts = [];
      for (const { name, value } of metaFields) {
        parts.push(Buffer.from(
          `--${boundary}${CRLF}` +
          `Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}` +
          `${value}${CRLF}`, 'utf8'
        ));
      }
      parts.push(Buffer.from(
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="photo"; filename="${filename}"${CRLF}` +
        `Content-Type: image/jpeg${CRLF}${CRLF}`, 'utf8'
      ));
      parts.push(fileBuffer);
      parts.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8'));
      const body = Buffer.concat(parts);

      const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendPhoto`, {
        method:  'POST',
        headers: {
          'Content-Type':   `multipart/form-data; boundary=${boundary}`,
          'Content-Length': String(body.length),
        },
        body,
      });
      result = await res.json();
    } else {
      result = await tgPost(botToken, 'sendMessage', {
        chat_id:      chatId,
        text:         caption,
        parse_mode:   'HTML',
        reply_markup: keyboard,
      });
    }

    if (result?.ok) {
      console.log(`[TgApproval] Sent approval request for pending #${pendingId}, msg_id=${result.result.message_id}`);
      return { messageId: result.result.message_id, hasPhoto };
    }

    console.error('[TgApproval] sendApprovalRequest failed:', result?.description);
    return null;
  } catch (e) {
    console.error('[TgApproval] sendApprovalRequest error:', e.message);
    return null;
  }
};

// ─── Cron: poll getUpdates, validate manager, process callbacks ───────────────

export const processTelegramCallbacks = async () => {
  try {
    const companies = await prisma.company.findMany({
      where: {
        telegram_bot_token: { not: null },
      },
      select: {
        id: true,
        telegram_bot_token: true,
        telegram_group_id:  true,
        telegram_attendance_group_id: true,
        telegram_leave_group_id: true,
        telegram_overtime_group_id: true,
        telegram_announcement_group_id: true,
      },
    });
    console.log(`[TgApproval] Processing ${companies.length} companies for Telegram callbacks`);
    for (const c of companies) {
      await processCompanyCallbacks(c);
    }
  } catch (e) {
    console.error('[TgApproval] processTelegramCallbacks error:', e.message);
  }
};

const processCompanyCallbacks = async (company) => {
  const token = company.telegram_bot_token;
  const groupId = company.telegram_group_id;
  const companyId = company.id;
  const offset = getOffset(token);

  try {
    console.log(`[TgApproval] Checking updates for company ${companyId} at offset ${offset}`);
    const url = `${TELEGRAM_API}/bot${token}/getUpdates?offset=${offset + 1}&timeout=0&allowed_updates=%5B%22callback_query%22,%22message%22%5D`;
    const res = await fetch(url);
    if (!res.ok) { console.error(`[TgApproval] getUpdates HTTP ${res.status}`); return; }

    const data = await res.json();
    if (!data.ok) { console.error('[TgApproval] getUpdates not ok:', data.description); return; }
    if (!data.result?.length) {
      console.log(`[TgApproval] No new updates for company ${companyId}`);
      return;
    }
    console.log(`[TgApproval] Found ${data.result.length} updates for company ${companyId}`);

    for (const update of data.result) {
      if (update.update_id >= getOffset(token)) saveOffset(token, update.update_id);

      // Handle callback queries (approval/reject/resetpassword)
      const cb = update.callback_query;
      if (cb) {
        const { data: cbData, id: cbId, message, from } = cb;
        console.log(`[TgApproval] Received callback from @${from?.username} (ID: ${from?.id})`);
        if (!cbData) continue;

        // Store chat ID from callback query
        if (from?.username) {
          await storeTelegramChatId(from.username.toLowerCase(), from.id.toString(), companyId);
        }

        const approvalMatch = cbData.match(/^(approve|reject)_(\d+)$/);
        const resetMatch = cbData.match(/^resetpassword_(\d+)$/);
        const leaveApprovalMatch = cbData.match(/^(approve_leave|reject_leave)_(\[.*?\])$/);
        const overtimeApprovalMatch = cbData.match(/^(approve_overtime|reject_overtime)_(\d+)$/);

        if (approvalMatch) {
          const action = approvalMatch[1];
          const pendingId = parseInt(approvalMatch[2]);
          const messageId = message?.message_id;
          const fromUsername = (from?.username || '').toLowerCase();
          const attendanceGroupId = company.telegram_attendance_group_id || company.telegram_group_id;

          await handleApprovalAction(token, attendanceGroupId, pendingId, action, cbId, messageId, fromUsername);
        } else if (resetMatch) {
          const userId = parseInt(resetMatch[1]);
          const messageId = message?.message_id;
          await handleResetPasswordCallback(token, userId, cbId, messageId, from, companyId);
        } else if (leaveApprovalMatch) {
          const action = leaveApprovalMatch[1];
          const leaveIdStr = leaveApprovalMatch[2];
          const messageId = message?.message_id;
          const chatId = message?.chat?.id;
          await handleLeaveApproval(token, leaveIdStr, action, cbId, messageId, chatId, from, companyId);
        } else if (overtimeApprovalMatch) {
          const action = overtimeApprovalMatch[1];
          const overtimeId = parseInt(overtimeApprovalMatch[2]);
          const messageId = message?.message_id;
          const chatId = message?.chat?.id;
          await handleOvertimeApproval(token, overtimeId, action, cbId, messageId, chatId, from, companyId);
        }
      }

      // Handle message commands (reset password)
      const msg = update.message;
      if (msg && msg.from) {
        const from = msg.from;
        console.log(`[TgApproval] Received message from @${from?.username} (ID: ${from?.id}): "${msg.text}"`);
        // Store chat ID when user sends message
        if (from?.username) {
          await storeTelegramChatId(from.username.toLowerCase(), from.id.toString(), companyId);
        }

        if (msg.text) {
          const text = msg.text.trim();
          const match = text.match(/^\/resetpassword_(\d+)$/);
          if (match) {
            const userId = match[1];
            await handleResetPasswordCommand(token, groupId, userId, from);
          } else if (text === '/start') {
            // Send welcome message
            console.log(`[TgApproval] Sending welcome message to @${from?.username} (ID: ${from.id})`);
            await sendTelegramMessage(token, from.id, "👋 Welcome! Your chat ID has been saved. You'll now receive direct messages from the bot.");
          }
        }
      }
    }
  } catch (e) {
    console.error(`[TgApproval] processCompanyCallbacks error (company ${companyId}):`, e.message);
  }
};

// Function to store user's Telegram chat ID
const storeTelegramChatId = async (username, chatId, companyId) => {
  try {
    // Normalize username: remove leading @ and lowercase
    const normalizedUsername = username.replace(/^@/, '').toLowerCase();
    console.log(`[Telegram] Attempting to store chat ID for @${username} (normalized: ${normalizedUsername}, company: ${companyId})...`);
    
    // Get all employees for the company first
    const employees = await prisma.employee.findMany({
      where: {
        company_id: companyId,
        telegram_username: {
          not: null,
        },
      },
      select: {
        id: true,
        telegram_username: true,
      },
    });
    
    // Find matching employees
    const matchingEmployeeIds = employees.filter(emp => {
      const empUsername = emp.telegram_username.replace(/^@/, '').toLowerCase();
      return empUsername === normalizedUsername;
    }).map(emp => emp.id);
    
    console.log(`[Telegram] Found ${matchingEmployeeIds.length} matching employee(s)`);
    
    if (matchingEmployeeIds.length > 0) {
      const result = await prisma.employee.updateMany({
        where: {
          id: { in: matchingEmployeeIds },
        },
        data: {
          telegram_chat_id: chatId,
        },
      });
      console.log(`[Telegram] Updated ${result.count} employee(s) for @${username} with chat ID: ${chatId}`);
    }
  } catch (e) {
    console.error('[Telegram] Error storing chat ID:', e.message);
  }
};

const handleResetPasswordCommand = async (token, groupId, userId, from) => {
  try {
    // Check if the sender is HR/Admin or department manager
    const fromUsername = (from?.username || '').toLowerCase();
    const fromChatId = from?.id;

    // Find the company from the token
    const company = await prisma.company.findFirst({
      where: { telegram_bot_token: token },
    });

    if (!company) {
      if (fromChatId) {
        await sendTelegramMessage(token, fromChatId, '❌ Company not found.');
      }
      return;
    }

    // Get the user to reset
    const userToReset = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: {
          include: {
            department_employee_department_idTodepartment: {
              include: {
                employee_department_manager_idToemployee: true,
              },
            },
          },
        },
      },
    });

    if (!userToReset || !userToReset.employee) {
      if (fromChatId) {
        await sendTelegramMessage(token, fromChatId, '❌ User not found.');
      }
      return;
    }

    const departmentManager = userToReset.employee.department_employee_department_idTodepartment?.employee_department_manager_idToemployee;
    const departmentManagerUsername = departmentManager?.telegram_username ? departmentManager.telegram_username.toLowerCase().replace(/^@/, '') : null;

    // Check if sender is HR/Admin in this company
    const hrUsers = await prisma.user.findMany({
      where: {
        employee: {
          company_id: company.id,
          OR: [
            {
              role: {
                name: {
                  in: ["Admin", "HR", "Human Resource"],
                },
              },
            },
            {
              department_employee_department_idTodepartment: {
                name: {
                  in: ["Human Resource", "HR"],
                },
              },
            },
          ],
        },
      },
      include: { employee: true },
    });

    const isHr = hrUsers.some(u => {
      const empUsername = (u.employee?.telegram_username || '').toLowerCase().replace(/^@/, '');
      return empUsername === fromUsername;
    });

    const isDepartmentManager = departmentManagerUsername && departmentManagerUsername === fromUsername;

    if (!isHr && !isDepartmentManager) {
      if (fromChatId) {
        await sendTelegramMessage(token, fromChatId, '⛔ Only HR/Admin or department manager can reset passwords.');
      }
      return;
    }

    // Reset password
    const result = await resetPasswordToDefault(userId);
    
    if (fromChatId) {
      if (result.result) {
        await sendTelegramMessage(token, fromChatId, `✅ ${result.message}`);
      } else {
        await sendTelegramMessage(token, fromChatId, `❌ ${result.message}`);
      }
    }
  } catch (e) {
    console.error('[TgApproval] handleResetPasswordCommand error:', e.message);
    if (from?.id) {
      await sendTelegramMessage(token, from.id, '❌ Error resetting password.');
    }
  }
};

// Helper function to find employee by telegram username
const findEmployeeByTelegramUsername = async (fromUsername, companyId) => {
  if (!fromUsername) return null;
  const normalizedUsername = fromUsername.replace(/^@/, '').toLowerCase();
  
  const employees = await prisma.employee.findMany({
    where: {
      company_id: companyId,
      telegram_username: { not: null },
    },
    include: {
      role: true,
      department_employee_department_idTodepartment: true,
    },
  });
  
  return employees.find(emp => {
    const empUsername = emp.telegram_username.replace(/^@/, '').toLowerCase();
    return empUsername === normalizedUsername;
  }) || null;
};

// Function to handle leave approval/rejection callbacks
const handleLeaveApproval = async (token, leaveIdStr, action, cbId, messageId, chatId, from, companyId) => {
  try {
    const fromUsername = (from?.username || '').toLowerCase();

    console.log(`[TgApproval] Handling leave ${action} for leave ${leaveIdStr} from @${fromUsername} (chat: ${chatId})`);

    const approverEmployee = await findEmployeeByTelegramUsername(fromUsername, companyId);
    if (!approverEmployee) {
      await answerCallback(token, cbId, 'You are not registered in the HR system with this Telegram username.', true);
      return;
    }

    const roleName = approverEmployee.role?.name?.toLowerCase() || '';
    const isHrOrAdmin = roleName === 'admin' || roleName === 'superadmin' || roleName.includes('hr');

    // Parse leave IDs array
    let leaveIds;
    try {
      leaveIds = JSON.parse(leaveIdStr);
    } catch (e) {
      // If parsing fails, treat as single ID
      leaveIds = [leaveIdStr];
    }

    if (!Array.isArray(leaveIds) || leaveIds.length === 0) {
      await answerCallback(token, cbId, 'Invalid leave request ID.', true);
      return;
    }

    // Get the first leave to check manager
    const firstLeave = await prisma.leaverecord.findUnique({
      where: { id: parseInt(leaveIds[0]) },
      include: {
        employee_leaverecord_employee_idToemployee: {
          include: {
            department_employee_department_idTodepartment: {
              include: {
                employee_department_manager_idToemployee: true,
              },
            },
          },
        },
      },
    });

    if (!firstLeave) {
      await answerCallback(token, cbId, 'Leave request not found.', true);
      return;
    }

    // Check if the sender is the department manager
    const departmentManager = firstLeave.employee_leaverecord_employee_idToemployee.department_employee_department_idTodepartment?.employee_department_manager_idToemployee;
    const isDepartmentManager = departmentManager && departmentManager.id === approverEmployee.id;

    // A manager cannot approve their own request
    const isSelfRequest = firstLeave.employee_id === approverEmployee.id;

    if (isSelfRequest) {
      if (!isHrOrAdmin) {
        await answerCallback(token, cbId, 'You cannot approve your own request. Must be approved by HR or Admin.', true);
        return;
      }
    } else {
      if (!isDepartmentManager && !isHrOrAdmin) {
        await answerCallback(token, cbId, 'Only the department manager or HR/Admin can approve/reject this leave.', true);
        return;
      }
    }

    // Approve or reject all leaves
    let result;
    if (action === 'approve_leave') {
      result = await ApproveLeave(leaveIdStr, approverEmployee.id);
    } else {
      result = await RejectLeave(leaveIdStr, approverEmployee.id);
    }

    // Edit the original message
    const employeeName = `${firstLeave.employee_leaverecord_employee_idToemployee.first_name} ${firstLeave.employee_leaverecord_employee_idToemployee.last_name}`;
    const newText = `📅 Leave Request\n\n` +
      `Employee: ${employeeName}\n` +
      `Status: ${action === 'approve_leave' ? '✅ Approved' : '❌ Rejected'}\n` +
      `By: @${fromUsername}`;

    await editDecisionMessage(token, chatId, messageId, newText, false);
    await answerCallback(token, cbId, result.message);

  } catch (e) {
    console.error('[TgApproval] handleLeaveApproval error:', e.message);
    await answerCallback(token, cbId, 'Error processing leave request.', true);
  }
};

const handleOvertimeApproval = async (token, overtimeId, action, cbId, messageId, chatId, from, companyId) => {
  try {
    const fromUsername = (from?.username || '').toLowerCase();

    console.log(`[TgApproval] Handling overtime ${action} for overtime ${overtimeId} from @${fromUsername} (chat: ${chatId})`);

    const approverEmployee = await findEmployeeByTelegramUsername(fromUsername, companyId);
    if (!approverEmployee) {
      await answerCallback(token, cbId, 'You are not registered in the HR system with this Telegram username.', true);
      return;
    }

    const roleName = approverEmployee.role?.name?.toLowerCase() || '';
    const isHrOrAdmin = roleName === 'admin' || roleName === 'superadmin' || roleName.includes('hr');

    // Find the overtime record
    const overtime = await prisma.overtime.findUnique({
      where: { id: overtimeId },
      include: {
        employee_overtime_employee_idToemployee: {
          include: {
            department_employee_department_idTodepartment: {
              include: {
                employee_department_manager_idToemployee: true,
              },
            },
          },
        },
      },
    });

    if (!overtime) {
      await answerCallback(token, cbId, 'Overtime request not found.', true);
      return;
    }

    // Check if the sender is the department manager
    const departmentManager = overtime.employee_overtime_employee_idToemployee.department_employee_department_idTodepartment?.employee_department_manager_idToemployee;
    const isDepartmentManager = departmentManager && departmentManager.id === approverEmployee.id;

    // A manager cannot approve their own request
    const isSelfRequest = overtime.employee_id === approverEmployee.id;

    if (isSelfRequest) {
      if (!isHrOrAdmin) {
        await answerCallback(token, cbId, 'You cannot approve your own request. Must be approved by HR or Admin.', true);
        return;
      }
    } else {
      if (!isDepartmentManager && !isHrOrAdmin) {
        await answerCallback(token, cbId, 'Only the department manager or HR/Admin can approve/reject this overtime.', true);
        return;
      }
    }

    // Approve or reject the overtime
    let result;
    if (action === 'approve_overtime') {
      result = await approveOvertime(overtimeId, approverEmployee.id);
    } else {
      result = await rejectOvertime(overtimeId, approverEmployee.id);
    }

    // Edit the original message
    const newText = `⏰ Overtime Request\n\n` +
      `Employee: ${overtime.employee_overtime_employee_idToemployee.first_name} ${overtime.employee_overtime_employee_idToemployee.last_name}\n` +
      `Date: ${new Date(overtime.start_date).toLocaleString()} - ${new Date(overtime.end_date).toLocaleString()}\n` +
      `Status: ${action === 'approve_overtime' ? '✅ Approved' : '❌ Rejected'}\n` +
      `By: @${fromUsername}`;

    await editDecisionMessage(token, chatId, messageId, newText, false);
    await answerCallback(token, cbId, result.message);

  } catch (e) {
    console.error('[TgApproval] handleOvertimeApproval error:', e.message);
    await answerCallback(token, cbId, 'Error processing overtime request.', true);
  }
};

const handleResetPasswordCallback = async (token, userId, cbId, messageId, from, companyId) => {
  try {
    const fromUsername = (from?.username || '').toLowerCase();
    const fromChatId = from?.id;

    console.log(`[TgApproval] Handling reset password callback for user ${userId} from @${fromUsername}`);

    // Get the user to reset
    const userToReset = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: {
          include: {
            department_employee_department_idTodepartment: {
              include: {
                employee_department_manager_idToemployee: true,
              },
            },
          },
        },
      },
    });

    if (!userToReset || !userToReset.employee) {
      await answerCallback(token, cbId, '❌ User not found.', true);
      return;
    }

    const departmentManager = userToReset.employee.department_employee_department_idTodepartment?.employee_department_manager_idToemployee;
    const departmentManagerUsername = departmentManager?.telegram_username ? departmentManager.telegram_username.toLowerCase().replace(/^@/, '') : null;

    // Check if sender is HR/Admin OR department manager
    const hrUsers = await prisma.user.findMany({
      where: {
        employee: {
          company_id: companyId,
          OR: [
            {
              role: {
                name: {
                  in: ["Admin", "HR", "Human Resource"],
                },
              },
            },
            {
              department_employee_department_idTodepartment: {
                name: {
                  in: ["Human Resource", "HR"],
                },
              },
            },
          ],
        },
      },
      include: { employee: true },
    });

    const isHr = hrUsers.some(u => {
      const empUsername = (u.employee?.telegram_username || '').toLowerCase().replace(/^@/, '');
      return empUsername === fromUsername;
    });

    const isDepartmentManager = departmentManagerUsername && departmentManagerUsername === fromUsername;

    if (!isHr && !isDepartmentManager) {
      await answerCallback(token, cbId, '⛔ Only HR/Admin or department manager can reset passwords.', true);
      return;
    }

    // Reset password
    const result = await resetPasswordToDefault(userId);

    // Edit the message to show result
    if (result.result) {
      await editDecisionMessage(token, fromChatId, messageId, `✅ ${result.message}`, false);
      await answerCallback(token, cbId, 'Password reset successfully!');
    } else {
      await answerCallback(token, cbId, `❌ ${result.message}`, true);
    }
  } catch (e) {
    console.error('[TgApproval] handleResetPasswordCallback error:', e.message);
    await answerCallback(token, cbId, '❌ Error resetting password.', true);
  }
};

const handleApprovalAction = async (token, groupId, pendingId, action, cbId, messageId, fromUsername) => {
  let pending;
  try {
    pending = await prisma.onlineattendancepending.findUnique({
      where:   { id: pendingId },
      include: { employee: { select: { first_name: true, last_name: true } } },
    });
  } catch (e) {
    console.error('[TgApproval] findUnique error:', e.message);
    await answerCallback(token, cbId, 'មានកំហុស');
    return;
  }

  if (!pending) {
    await answerCallback(token, cbId, 'មិនរកឃើញកំណត់ត្រានេះ');
    return;
  }

  // ── Manager-only gate ────────────────────────────────────────────────────────
  // Use stored username first; fall back to live DB lookup (covers old records
  // where manager_telegram_username was NULL at submission time).
  let managerUsername = pending.manager_telegram_username
    ? pending.manager_telegram_username.toLowerCase()
    : null;

  if (!managerUsername) {
    // Live lookup: employee → department → manager → telegram_username
    try {
      const emp = await prisma.employee.findUnique({
        where:  { id: pending.employee_id },
        select: { department_id: true },
      });
      if (emp?.department_id) {
        const dept = await prisma.department.findUnique({
          where:  { id: emp.department_id },
          select: {
            employee_department_manager_idToemployee: {
              select: { telegram_username: true },
            },
          },
        });
        const raw = dept?.employee_department_manager_idToemployee?.telegram_username;
        if (raw) {
          managerUsername = raw.replace(/^@/, '').toLowerCase();
          // Back-fill the stored value so future callbacks are faster
          await prisma.onlineattendancepending.update({
            where: { id: pending.id },
            data:  { manager_telegram_username: managerUsername },
          });
        }
      }
    } catch (_) {}
  }

  if (managerUsername) {
    if (fromUsername !== managerUsername) {
      await answerCallback(
        token, cbId,
        `⛔ អ្នកមិនមានសិទ្ធិ។ តែ @${managerUsername} ប៉ុណ្ណោះអាចចាត់ចែងបាន។`,
        true
      );
      return;
    }
  }
  // If no manager is configured at all, no one can act — block everyone
  else {
    await answerCallback(
      token, cbId,
      `⛔ នាយកដ្ឋាននេះមិនទាន់មានអ្នកគ្រប់គ្រង។ សូមកំណត់អ្នកគ្រប់គ្រងនាយកដ្ឋានជាមុនសិន។`,
      true
    );
    return;
  }

  // Prevent double-processing
  if (pending.status !== 'pending') {
    await answerCallback(token, cbId, pending.status === 'approved' ? 'បានអនុម័តហើយ ✅' : 'បានបដិសេធហើយ ❌');
    return;
  }

  const fullName = `${pending.employee.first_name} ${pending.employee.last_name}`.trim();
  const pad = (n) => String(n).padStart(2, '0');
  const d   = toICTDate(pending.created_at);
  const timeStr = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;

  // Location link for the decision message too
  const lat = parseFloat(pending.latitude);
  const lon = parseFloat(pending.longitude);
  const locationLine = (!isNaN(lat) && !isNaN(lon))
    ? `📍 <a href="https://maps.google.com/?q=${lat},${lon}">មើលទីតាំង</a>\n`
    : '';

  const hasPhoto = !!pending.photo_path;

  if (action === 'approve') {
    try {
      const meta     = pending.computed_meta || {};
      const workAt   = meta.work_at  ? new Date(meta.work_at) : new Date(pending.created_at);
      const status   = meta.status   || 'present';
      const is_late  = meta.is_late  || false;
      const is_early = meta.is_early || false;

      if (pending.time_mode_id && !pending.has_activity) {
        await clockAttendance(
          pending.employee_id,
          pending.time_mode_id,
          status,
          'ONLINE',
          { is_late, is_early, work_at: workAt }
        );
        console.log(`[TgApproval] Created attendance record for employee ${pending.employee_id}`);
      }

      await prisma.onlineattendancepending.update({
        where: { id: pendingId },
        data:  { status: 'approved' },
      });

      // Send real-time notification to the employee
      try {
        const empUser = await prisma.user.findFirst({
          where: { employee_id: pending.employee_id }
        });
        if (empUser) {
          const { createNotification } = await import("./Notification.js");
          await createNotification(pending.company_id, "Online Attendance Approved", "Your online attendance request has been approved.", empUser.id, pending.id);
        }
      } catch (e) {
        console.error("[Online Attendance Approval Notification Error]", e.message);
      }

      await answerCallback(token, cbId, 'បានអនុម័ត ✅');

      if (messageId) {
        const approvedText =
          `✅ <b>បានអនុម័ត</b>\n` +
          `━━━━━━━━━━━━━━━━━\n` +
          `👤 <b>បុគ្គលិក៖</b> ${fullName}\n` +
          `⏰ <b>ម៉ោង៖</b> ${timeStr}\n` +
          locationLine +
          `━━━━━━━━━━━━━━━━━\n` +
          `✅ <i>វត្តមានត្រូវបានកត់ត្រា</i>`;
        await editDecisionMessage(token, groupId, messageId, approvedText, hasPhoto);
      }
    } catch (e) {
      console.error('[TgApproval] approve error:', e.message);
      await answerCallback(token, cbId, 'មានកំហុស: ' + e.message);
    }
  } else {
    await prisma.onlineattendancepending.update({
      where: { id: pendingId },
      data:  { status: 'rejected' },
    });

    // Send real-time notification to the employee
    try {
      const empUser = await prisma.user.findFirst({
        where: { employee_id: pending.employee_id }
      });
      if (empUser) {
        const { createNotification } = await import("./Notification.js");
        await createNotification(pending.company_id, "Online Attendance Rejected", "Your online attendance request has been rejected.", empUser.id, pending.id);
      }
    } catch (e) {
      console.error("[Online Attendance Rejection Notification Error]", e.message);
    }

    await answerCallback(token, cbId, 'បានបដិសេធ ❌');

    if (messageId) {
      const rejectedText =
        `❌ <b>បានបដិសេធ</b>\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>បុគ្គលិក៖</b> ${fullName}\n` +
        `⏰ <b>ម៉ោង៖</b> ${timeStr}\n` +
        locationLine +
        `━━━━━━━━━━━━━━━━━\n` +
        `❌ <i>វត្តមានត្រូវបានបដិសេធ</i>`;
      await editDecisionMessage(token, groupId, messageId, rejectedText, hasPhoto);
    }
  }
};
