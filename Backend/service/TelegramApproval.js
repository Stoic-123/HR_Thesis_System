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
import { toICTDate, formatICTDate, formatICTTime } from '../utils/timezone.js';
import { ApproveLeave, RejectLeave } from './Leave.js';
import { approveOvertime, rejectOvertime } from './Overtime.js';
import { createLateRequest, approveLateRequest, rejectLateRequest, cancelLateRequest, validateAndInferLateEarlyRequest } from './LateRequest.js';

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

let isPolling = false;
const processedUpdateIds = new Set();
const MAX_PROCESSED_UPDATES = 2000;

const isUpdateProcessed = (updateId) => {
  if (processedUpdateIds.has(updateId)) {
    return true;
  }
  processedUpdateIds.add(updateId);
  if (processedUpdateIds.size > MAX_PROCESSED_UPDATES) {
    const oldest = processedUpdateIds.values().next().value;
    processedUpdateIds.delete(oldest);
  }
  return false;
};

export const processTelegramCallbacks = async () => {
  if (isPolling) return;
  isPolling = true;
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
        telegram_late_group_id: true,
        telegram_overtime_group_id: true,
        telegram_announcement_group_id: true,
      },
    });

    const botMap = new Map();
    for (const c of companies) {
      if (!c.telegram_bot_token) continue;
      if (!botMap.has(c.telegram_bot_token)) {
        botMap.set(c.telegram_bot_token, []);
      }
      botMap.get(c.telegram_bot_token).push(c);
    }

    for (const [token, companyList] of botMap.entries()) {
      await processBotCallbacks(token, companyList);
    }
  } catch (e) {
    console.error('[TgApproval] processTelegramCallbacks error:', e.message);
  } finally {
    isPolling = false;
  }
};

const processBotCallbacks = async (token, companyList) => {
  const primaryCompany = companyList[0];
  const companyId = primaryCompany.id;
  const groupId = primaryCompany.telegram_group_id;
  const offset = getOffset(token);

  try {
    const url = `${TELEGRAM_API}/bot${token}/getUpdates?offset=${offset + 1}&timeout=0&allowed_updates=%5B%22callback_query%22,%22message%22%5D`;
    const res = await fetch(url);
    if (!res.ok) { console.error(`[TgApproval] getUpdates HTTP ${res.status}`); return; }

    const data = await res.json();
    if (!data.ok) { console.error('[TgApproval] getUpdates not ok:', data.description); return; }
    if (!data.result?.length) {
      return;
    }
    console.log(`[TgApproval] Found ${data.result.length} updates for bot token ...${token.slice(-8)}`);

    for (const update of data.result) {
      if (update.update_id >= getOffset(token)) saveOffset(token, update.update_id);

      if (isUpdateProcessed(update.update_id)) {
        console.log(`[TgApproval] Skipping already processed update_id ${update.update_id}`);
        continue;
      }

      // Handle callback queries (approval/reject/resetpassword)
      const cb = update.callback_query;
      if (cb) {
        const { data: cbData, id: cbId, message, from } = cb;
        console.log(`[TgApproval] Received callback from @${from?.username} (ID: ${from?.id})`);
        if (!cbData) continue;

        // Store chat ID from callback query for associated companies
        if (from?.username) {
          for (const c of companyList) {
            await storeTelegramChatId(from.username.toLowerCase(), from.id.toString(), c.id);
          }
        }

        const approvalMatch = cbData.match(/^(approve|reject)_(\d+)$/);
        const resetMatch = cbData.match(/^resetpassword_(\d+)$/);
        const leaveApprovalMatch = cbData.match(/^(approve_leave|reject_leave)_(\[.*?\])$/);
        const overtimeApprovalMatch = cbData.match(/^(approve_overtime|reject_overtime)_(\d+)$/);
        const lateApprovalMatch = cbData.match(/^(approve_late|reject_late)_(\d+)$/);

        if (approvalMatch) {
          const action = approvalMatch[1];
          const pendingId = parseInt(approvalMatch[2]);
          const messageId = message?.message_id;
          const fromUsername = (from?.username || '').toLowerCase();
          const fromChatId = from?.id ? String(from.id) : null;
          const attendanceGroupId = primaryCompany.telegram_attendance_group_id || primaryCompany.telegram_group_id;

          await handleApprovalAction(token, attendanceGroupId, pendingId, action, cbId, messageId, fromUsername, fromChatId);
        } else if (resetMatch) {
          const userId = parseInt(resetMatch[1]);
          const messageId = message?.message_id;
          await handleResetPasswordCallback(token, userId, cbId, messageId, from, companyId, message);
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
        } else if (lateApprovalMatch) {
          const action = lateApprovalMatch[1];
          const lateId = parseInt(lateApprovalMatch[2]);
          const messageId = message?.message_id;
          const chatId = message?.chat?.id;
          await handleLateApproval(token, lateId, action, cbId, messageId, chatId, from, companyId);
        }
      }

      // Handle message commands (reset password, #late request)
      const msg = update.message;
      if (msg && msg.from) {
        const from = msg.from;
        console.log(`[TgApproval] Received message from @${from?.username} (ID: ${from?.id}): "${msg.text}"`);
        // Store chat ID when user sends message
        if (from?.username) {
          for (const c of companyList) {
            await storeTelegramChatId(from.username.toLowerCase(), from.id.toString(), c.id);
          }
        }

        if (msg.text) {
          const text = msg.text.trim();
          const lateMatch = text.match(/^(?:#|\/)late(?:@\w+)?(?:\s+([\s\S]+))?$/i);
          const earlyMatch = text.match(/^(?:#|\/)(?:early|ealry)(?:@\w+)?(?:\s+([\s\S]+))?$/i);
          const cancelMatch = text.match(/^(?:#|\/)cancel(?:_(?:late|early))?(?:@\w+)?$/i);
          const resetMatch = text.match(/^\/resetpassword_(\d+)$/);

          if (lateMatch) {
            const reason = lateMatch[1] ? lateMatch[1].trim() : "";
            await handleLateEarlyRequestCommand(token, msg, from, reason, companyList, "LATE");
          } else if (earlyMatch) {
            const reason = earlyMatch[1] ? earlyMatch[1].trim() : "";
            await handleLateEarlyRequestCommand(token, msg, from, reason, companyList, "EARLY");
          } else if (cancelMatch) {
            await handleCancelLateRequestCommand(token, msg, from, companyList);
          } else if (resetMatch) {
            const userId = resetMatch[1];
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
    console.error(`[TgApproval] processBotCallbacks error (token ...${token.slice(-8)}):`, e.message);
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

/**
 * Check if a Telegram sender (chatId / username) is authorized to reset a user's password.
 * Authorized if:
 * 1. Sender is the Department Manager of userToReset
 * 2. Sender is HR or Admin in the user's company (matches role/department name)
 */
export const isAuthorizedToResetPassword = async (companyId, userToReset, fromChatId, fromUsername) => {
  try {
    const fromChatIdStr = fromChatId ? fromChatId.toString() : null;
    const cleanFromUsername = fromUsername ? fromUsername.toLowerCase().replace(/^@/, '').trim() : null;

    if (!fromChatIdStr && !cleanFromUsername) {
      return { authorized: false, reason: "No identifier provided for sender" };
    }

    // 1. Check Department Manager
    const deptManager = userToReset?.employee?.department_employee_department_idTodepartment?.employee_department_manager_idToemployee;
    if (deptManager) {
      const dmUsername = deptManager.telegram_username ? deptManager.telegram_username.toLowerCase().replace(/^@/, '').trim() : null;
      const dmChatId = deptManager.telegram_chat_id ? deptManager.telegram_chat_id.toString() : null;

      const dmChatMatch = fromChatIdStr && dmChatId && fromChatIdStr === dmChatId;
      const dmUserMatch = cleanFromUsername && dmUsername && cleanFromUsername === dmUsername;

      if (dmChatMatch || dmUserMatch) {
        return {
          authorized: true,
          user: deptManager,
          role: "Department Manager",
        };
      }
    }

    // 2. Check HR / Admin employees in the user's company
    const targetCompanyId = userToReset?.employee?.company_id || companyId;
    const hrAdminUsers = await prisma.user.findMany({
      where: {
        employee: {
          company_id: targetCompanyId,
          OR: [
            {
              role: {
                name: {
                  in: [
                    "Admin", "admin", "ADMIN",
                    "Super Admin", "super admin", "SuperAdmin", "SUPER ADMIN",
                    "HR", "hr", "Hr",
                    "HR Manager", "hr manager", "Hr Manager", "HR MANAGER",
                    "Human Resource", "human resource", "Human Resources", "human resources",
                    "HR Officer", "hr officer", "HR Executive", "hr executive", "HR Specialist", "hr specialist",
                    "General Manager", "general manager", "Director", "director"
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

    for (const u of hrAdminUsers) {
      const emp = u.employee;
      if (!emp) continue;

      const empUsername = emp.telegram_username ? emp.telegram_username.toLowerCase().replace(/^@/, '').trim() : null;
      const empChatId = emp.telegram_chat_id ? emp.telegram_chat_id.toString() : null;

      const chatMatch = fromChatIdStr && empChatId && fromChatIdStr === empChatId;
      const userMatch = cleanFromUsername && empUsername && cleanFromUsername === empUsername;

      if (chatMatch || userMatch) {
        return {
          authorized: true,
          user: emp,
          role: emp.role?.name || "HR/Admin",
        };
      }
    }

    return { authorized: false, reason: "Sender is not HR/Admin or department manager" };
  } catch (err) {
    console.error("[TgApproval] isAuthorizedToResetPassword error:", err.message);
    return { authorized: false, reason: err.message };
  }
};

const handleResetPasswordCommand = async (token, groupId, userId, from) => {
  try {
    const numUserId = parseInt(userId);
    if (isNaN(numUserId)) {
      if (from?.id) await sendTelegramMessage(token, from.id, '❌ Invalid user ID.');
      return;
    }

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
      where: { id: numUserId },
      include: {
        employee: {
          include: {
            company: true,
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
        await sendTelegramMessage(token, fromChatId, '❌ User not found in system.');
      }
      return;
    }

    const authCheck = await isAuthorizedToResetPassword(company.id, userToReset, fromChatId, fromUsername);
    if (!authCheck.authorized) {
      if (fromChatId) {
        await sendTelegramMessage(token, fromChatId, '⛔ Only HR/Admin or department manager can reset passwords.');
      }
      return;
    }

    // Reset password
    const result = await resetPasswordToDefault(numUserId);
    
    if (fromChatId) {
      if (result.result) {
        const defaultPassword = userToReset.employee?.company?.default_password || "Hr12345";
        await sendTelegramMessage(token, fromChatId, `✅ Password for <b>${userToReset.username}</b> reset to default (<code>${defaultPassword}</code>).`);
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

// Helper function to find employee by telegram username or chat ID
const findEmployeeByTelegramUsername = async (fromUsername, companyId, fromChatId = null) => {
  const cleanUsername = fromUsername ? fromUsername.replace(/^@/, '').toLowerCase().trim() : null;
  const cleanChatId = fromChatId ? fromChatId.toString().trim() : null;
  if (!cleanUsername && !cleanChatId) return null;
  
  const employees = await prisma.employee.findMany({
    where: {
      company_id: companyId,
      is_active: 'active',
      OR: [
        { telegram_username: { not: null } },
        { telegram_chat_id: { not: null } },
      ],
    },
    include: {
      role: true,
      department_employee_department_idTodepartment: {
        include: {
          employee_department_manager_idToemployee: true,
        },
      },
    },
  });
  
  return (
    employees.find((emp) => {
      const empUsername = emp.telegram_username
        ? emp.telegram_username.replace(/^@/, '').toLowerCase().trim()
        : null;
      const empChatId = emp.telegram_chat_id
        ? emp.telegram_chat_id.toString().trim()
        : null;
      if (cleanUsername && empUsername && empUsername === cleanUsername) return true;
      if (cleanChatId && empChatId && empChatId === cleanChatId) return true;
      return false;
    }) || null
  );
};

// Function to handle leave approval/rejection callbacks
const handleLeaveApproval = async (token, leaveIdStr, action, cbId, messageId, chatId, from, companyId) => {
  try {
    const fromUsername = (from?.username || '').toLowerCase();
    const fromChatId = from?.id ? String(from.id) : null;

    console.log(`[TgApproval] Handling leave ${action} for leave ${leaveIdStr} from @${fromUsername} (chat: ${chatId}, id: ${fromChatId})`);

    const approverEmployee = await findEmployeeByTelegramUsername(fromUsername, companyId, fromChatId);
    if (!approverEmployee) {
      await answerCallback(token, cbId, 'You are not registered in the HR system with this Telegram account.', true);
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
    const fromChatId = from?.id ? String(from.id) : null;

    console.log(`[TgApproval] Handling overtime ${action} for overtime ${overtimeId} from @${fromUsername} (chat: ${chatId}, id: ${fromChatId})`);

    const approverEmployee = await findEmployeeByTelegramUsername(fromUsername, companyId, fromChatId);
    if (!approverEmployee) {
      await answerCallback(token, cbId, 'You are not registered in the HR system with this Telegram account.', true);
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

const handleResetPasswordCallback = async (token, userId, cbId, messageId, from, companyId, message) => {
  try {
    const numUserId = parseInt(userId);
    if (isNaN(numUserId)) {
      await answerCallback(token, cbId, '❌ Invalid user ID.', true);
      return;
    }

    const fromUsername = (from?.username || '').toLowerCase();
    const fromChatId = from?.id;
    const chatId = message?.chat?.id || fromChatId;

    console.log(`[TgApproval] Handling reset password callback for user ${numUserId} from @${fromUsername} (ID: ${fromChatId})`);

    // Get the user to reset
    const userToReset = await prisma.user.findUnique({
      where: { id: numUserId },
      include: {
        employee: {
          include: {
            company: true,
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
      await answerCallback(token, cbId, '❌ User not found in system.', true);
      return;
    }

    const authCheck = await isAuthorizedToResetPassword(companyId, userToReset, fromChatId, fromUsername);
    if (!authCheck.authorized) {
      console.log(`[TgApproval] Unauthorized reset password attempt for user ${numUserId} by @${fromUsername} (ID: ${fromChatId})`);
      await answerCallback(token, cbId, '⛔ Only HR/Admin or department manager can reset passwords.', true);
      return;
    }

    // Reset password
    const result = await resetPasswordToDefault(numUserId);

    // Edit the message to show result
    if (result.result) {
      const defaultPassword = userToReset.employee?.company?.default_password || "Hr12345";
      const empName = `${userToReset.employee?.first_name || ''} ${userToReset.employee?.last_name || ''}`.trim() || userToReset.username;
      
      const successText = `✅ <b>Password Reset Successful</b>\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>Employee:</b> ${empName}\n` +
        `📋 <b>Username:</b> ${userToReset.username}\n` +
        `🔑 <b>Default Password:</b> <code>${defaultPassword}</code>\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `Authorized by: ${authCheck.role} (@${fromUsername || fromChatId})`;

      await editDecisionMessage(token, chatId, messageId, successText, false);
      await answerCallback(token, cbId, '✅ Password reset to default successfully!');
    } else {
      await answerCallback(token, cbId, `❌ ${result.message}`, true);
    }
  } catch (e) {
    console.error('[TgApproval] handleResetPasswordCallback error:', e.message);
    await answerCallback(token, cbId, '❌ Error resetting password.', true);
  }
};

const handleApprovalAction = async (token, groupId, pendingId, action, cbId, messageId, fromUsername, fromChatId = null) => {
  let pending;
  try {
    pending = await prisma.onlineattendancepending.findUnique({
      where:   { id: pendingId },
      include: { employee: { select: { first_name: true, last_name: true, company_id: true } } },
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
  let isAuthorized = false;
  let managerDisplay = pending.manager_telegram_username || "Manager";

  try {
    const emp = await prisma.employee.findUnique({
      where:  { id: pending.employee_id },
      select: {
        department_employee_department_idTodepartment: {
          select: {
            employee_department_manager_idToemployee: {
              select: {
                id: true,
                telegram_username: true,
                telegram_chat_id: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
    });

    const manager = emp?.department_employee_department_idTodepartment?.employee_department_manager_idToemployee;
    if (manager) {
      const mgrUsername = manager.telegram_username ? manager.telegram_username.replace(/^@/, '').toLowerCase().trim() : null;
      const mgrChatId = manager.telegram_chat_id ? String(manager.telegram_chat_id).trim() : null;
      managerDisplay = mgrUsername ? `@${mgrUsername}` : `${manager.first_name} ${manager.last_name}`;

      const userMatch = fromUsername && mgrUsername && fromUsername === mgrUsername;
      const chatMatch = fromChatId && mgrChatId && fromChatId === mgrChatId;

      if (userMatch || chatMatch) {
        isAuthorized = true;
      }
    } else if (pending.manager_telegram_username) {
      const pendingMgrUsername = pending.manager_telegram_username.replace(/^@/, '').toLowerCase().trim();
      if (fromUsername && pendingMgrUsername && fromUsername === pendingMgrUsername) {
        isAuthorized = true;
      }
    }
  } catch (err) {
    console.error("[TgApproval] manager check error:", err.message);
  }

  if (!isAuthorized) {
    await answerCallback(
      token, cbId,
      `⛔ អ្នកមិនមានសិទ្ធិ។ តែ ${managerDisplay} ប៉ុណ្ណោះអាចចាត់ចែងបាន។`,
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

/**
 * Handle #late and #early message command
 */
const handleLateEarlyRequestCommand = async (token, msg, from, reason, companyList, commandType = "LATE") => {
  try {
    const fromUsername = from?.username ? from.username.replace(/^@/, '').toLowerCase().trim() : null;
    const fromChatId = from?.id ? from.id.toString().trim() : null;

    console.log(`[TgApproval] Processing #${commandType.toLowerCase()} request from @${fromUsername} (ID: ${fromChatId}): "${reason}"`);

    // 1. Find employee across the companies associated with this bot token
    let employee = null;
    let targetCompany = null;

    for (const company of companyList) {
      const found = await findEmployeeByTelegramUsername(fromUsername, company.id, fromChatId);
      if (found) {
        employee = found;
        targetCompany = company;
        break;
      }
    }

    if (!employee || !targetCompany) {
      const userDisplay = fromUsername ? `@${fromUsername}` : (from?.first_name || "User");
      const notFoundMsg =
        `⚠️ <b>រកមិនឃើញគណនីបុគ្គលិក / Employee Not Found</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `គណនី Telegram របស់អ្នក (<b>${userDisplay}</b>) មិនទាន់ត្រូវបានភ្ជាប់ក្នុងប្រព័ន្ធ HR នៅឡើយទេ។\n` +
        `សូមភ្ជាប់ Telegram Username របស់អ្នកក្នុង Profile ប្រព័ន្ធ HR ដើម្បីស្នើសុំ។\n` +
        `<i>Your Telegram account is not linked to any active employee profile.</i>`;

      await sendTelegramMessage(token, msg.chat.id, notFoundMsg, {
        reply_to_message_id: msg.message_id,
      });
      return;
    }

    // 2. Validate timing and auto-detect target shift
    const validation = await validateAndInferLateEarlyRequest({
      employee_id: employee.id,
      company_id: targetCompany.id,
      commandType,
      requestDate: new Date(),
    });

    if (!validation.valid) {
      const errorMsg =
        `⚠️ <b>មិនអាចស្នើសុំបានទេ / Request Not Allowed</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `${validation.message}`;

      await sendTelegramMessage(token, msg.chat.id, errorMsg, {
        reply_to_message_id: msg.message_id,
      });
      return;
    }

    // 3. Identify hierarchy & who to mention as approver
    const dept = employee.department_employee_department_idTodepartment;
    const deptManager = dept?.employee_department_manager_idToemployee;
    const isDeptManager = deptManager && deptManager.id === employee.id;
    const roleName = (employee.role?.name || '').toLowerCase();
    const isManagerRole = isDeptManager || roleName.includes('manager') || roleName.includes('director') || roleName.includes('lead');

    let mentionLine = '';
    let approverUsername = null;

    if (isManagerRole) {
      // Requester is a Manager -> MUST be approved by Admin / Super Admin
      const adminUsers = await prisma.user.findMany({
        where: {
          employee: {
            company_id: targetCompany.id,
            role: {
              name: {
                in: [
                  'Admin', 'admin', 'ADMIN',
                  'Super Admin', 'super admin', 'SuperAdmin', 'SUPER ADMIN',
                  'General Manager', 'general manager', 'Director', 'director'
                ]
              }
            }
          }
        },
        include: {
          employee: true
        }
      });

      const adminUsernames = adminUsers
        .map(u => u.employee?.telegram_username?.replace(/^@/, '').trim())
        .filter(Boolean);

      if (adminUsernames.length > 0) {
        mentionLine = adminUsernames.map(u => `@${u}`).join(' ') + ' (Admin)';
        approverUsername = adminUsernames[0];
      } else {
        mentionLine = '👔 <b>Admin / Super Admin</b>';
      }
    } else {
      // Regular staff -> Mention Department Manager (or HR if no manager)
      if (deptManager) {
        const rawMgrUsername = deptManager.telegram_username ? deptManager.telegram_username.replace(/^@/, '').trim() : null;
        if (rawMgrUsername) {
          mentionLine = `@${rawMgrUsername}`;
          approverUsername = rawMgrUsername;
        } else {
          mentionLine = `${deptManager.first_name} ${deptManager.last_name} (Manager)`;
        }
      } else {
        mentionLine = '👔 <b>HR / Admin</b>';
      }
    }

    // 4. Create Request in database
    const finalReason = reason ? reason.trim() : "មិនបានបញ្ជាក់មូលហេតុ / Not specified";
    const isEarly = validation.request_type === "EARLY";

    const createResult = await createLateRequest({
      employee_id: employee.id,
      company_id: targetCompany.id,
      request_type: validation.request_type,
      time_field: validation.time_field,
      scheduled_time: validation.scheduled_time,
      reason: finalReason,
      request_date: new Date(),
      manager_telegram_username: approverUsername,
    });

    if (!createResult.result || !createResult.data) {
      await sendTelegramMessage(token, msg.chat.id, `❌ មានបញ្ហាក្នុងការបង្កើតសំណើ: ${createResult.message}`, {
        reply_to_message_id: msg.message_id,
      });
      return;
    }

    const lateRequest = createResult.data;
    const employeeFullName = `${employee.first_name} ${employee.last_name}`.trim();
    const formattedDate = formatICTDate(lateRequest.request_date);
    const formattedTime = formatICTTime(lateRequest.request_date);

    // 5. Formulate request message
    const titleKh = isEarly
      ? `🏃‍♂️ <b>សំណើសុំចេញមុន / Early Leave Request (${validation.field_label}: ${validation.scheduled_time})</b>`
      : `⏰ <b>សំណើសុំយឺត / Late Request (${validation.field_label}: ${validation.scheduled_time})</b>`;

    const caption =
      `${titleKh}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>បុគ្គលិក / Employee:</b> ${employeeFullName}\n` +
      `🏢 <b>ផ្នែក / Department:</b> ${dept?.name || 'N/A'}\n` +
      `🕐 <b>វេន / Shift:</b> ${validation.field_label} (${validation.scheduled_time})\n` +
      `📅 <b>កាលបរិច្ឆេទ / Date:</b> ${formattedDate} (${formattedTime})\n` +
      `💬 <b>មូលហេតុ / Reason:</b> ${finalReason}\n` +
      `👔 <b>អ្នកអនុម័ត / Approver:</b> ${mentionLine}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `<i>សូមអ្នកគ្រប់គ្រងពិនិត្យ និងអនុម័តសំណើនេះ</i>`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ អនុម័ត / Approve", callback_data: `approve_late_${lateRequest.id}` },
          { text: "❌ បដិសេធ / Reject", callback_data: `reject_late_${lateRequest.id}` }
        ]
      ]
    };

    // 6. Target group selection
    const activeGroupId = targetCompany.telegram_late_group_id || targetCompany.telegram_attendance_group_id || targetCompany.telegram_group_id;
    const isGroupMessage = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
    const targetChatId = isGroupMessage ? msg.chat.id : (activeGroupId || msg.chat.id);

    const tgRes = await sendTelegramMessage(token, targetChatId, caption, {
      reply_markup: inlineKeyboard,
      reply_to_message_id: (String(targetChatId) === String(msg.chat.id) ? msg.message_id : undefined)
    });

    if (tgRes?.result?.message_id) {
      await prisma.laterequest.update({
        where: { id: lateRequest.id },
        data: {
          telegram_message_id: tgRes.result.message_id,
          telegram_chat_id: String(targetChatId),
        }
      });
      console.log(`[TgApproval] Sent ${validation.request_type} request #${lateRequest.id} to chat ${targetChatId}, msg_id=${tgRes.result.message_id}`);
    }

    // If sent from private chat and dispatched to group, acknowledge in private chat too
    if (!isGroupMessage && activeGroupId && String(activeGroupId) !== String(msg.chat.id)) {
      const ackKh = isEarly ? "សំណើសុំចេញមុនរបស់អ្នក" : "សំណើសុំយឺតរបស់អ្នក";
      await sendTelegramMessage(token, msg.chat.id, `✅ ${ackKh}ត្រូវបានបញ្ជូនទៅក្រុមអ្នកគ្រប់គ្រងហើយ / Your request has been sent for approval.`);
    }

  } catch (err) {
    console.error("[TgApproval] handleLateEarlyRequestCommand error:", err.message);
    await sendTelegramMessage(token, msg.chat.id, "❌ Error processing request.", {
      reply_to_message_id: msg.message_id
    });
  }
};

/**
 * Handle late / early approval / rejection callback
 */
const handleLateApproval = async (token, lateId, action, cbId, messageId, chatId, from, companyId) => {
  try {
    const fromUsername = (from?.username || '').toLowerCase();
    const fromChatId = from?.id ? from.id.toString() : null;

    console.log(`[TgApproval] Handling late ${action} for request ${lateId} from @${fromUsername} (ID: ${fromChatId})`);

    const approverEmployee = await findEmployeeByTelegramUsername(fromUsername, companyId, fromChatId);
    if (!approverEmployee) {
      await answerCallback(token, cbId, 'You are not registered in the HR system with this Telegram account.', true);
      return;
    }

    const lateRequest = await prisma.laterequest.findUnique({
      where: { id: lateId },
      include: {
        employee: {
          include: {
            role: true,
            department_employee_department_idTodepartment: {
              include: {
                employee_department_manager_idToemployee: true,
              },
            },
          },
        },
      },
    });

    if (!lateRequest) {
      await answerCallback(token, cbId, 'Request not found.', true);
      return;
    }

    if (lateRequest.status !== 'pending') {
      await answerCallback(token, cbId, `This request has already been ${lateRequest.status}.`, true);
      return;
    }

    const isEarly = lateRequest.request_type === 'EARLY';
    const typeLabelEn = isEarly ? 'early leave' : 'late';

    // 1. Self-approval is strictly forbidden
    const isSelfRequest = lateRequest.employee_id === approverEmployee.id;
    if (isSelfRequest) {
      await answerCallback(token, cbId, `⛔ You cannot approve your own ${typeLabelEn} request. It must be approved by an Admin / Manager.`, true);
      return;
    }

    // 2. Role & Hierarchy checks
    const approverRole = (approverEmployee.role?.name || '').toLowerCase();
    const isApproverAdmin =
      approverRole === 'admin' ||
      approverRole === 'superadmin' ||
      approverRole === 'super admin' ||
      approverRole === 'director' ||
      approverRole === 'general manager';

    const isApproverHr =
      approverRole.includes('hr') ||
      (approverEmployee.department_employee_department_idTodepartment?.name || '').toLowerCase().includes('hr');

    const reqDeptManager = lateRequest.employee.department_employee_department_idTodepartment?.employee_department_manager_idToemployee;
    const isApproverDeptManager = reqDeptManager && reqDeptManager.id === approverEmployee.id;

    // Check if requester is a manager
    const requesterIsDeptManager = reqDeptManager && reqDeptManager.id === lateRequest.employee_id;
    const requesterRole = (lateRequest.employee.role?.name || '').toLowerCase();
    const requesterIsManager = requesterIsDeptManager || requesterRole.includes('manager') || requesterRole.includes('director') || requesterRole.includes('lead');

    if (requesterIsManager) {
      // If a manager requested late, ONLY Admin / Super Admin (or HR Manager) can approve
      if (!isApproverAdmin && !isApproverHr) {
        await answerCallback(token, cbId, `⛔ Only Admin / Super Admin can approve a manager's ${typeLabelEn} request.`, true);
        return;
      }
    } else {
      // Regular employee -> can be approved by Department Manager or HR/Admin
      if (!isApproverDeptManager && !isApproverHr && !isApproverAdmin) {
        await answerCallback(token, cbId, `⛔ Only the department manager or HR/Admin can approve/reject this ${typeLabelEn} request.`, true);
        return;
      }
    }

    // 3. Process approval / rejection
    const isApprove = action === 'approve_late';
    if (isApprove) {
      await approveLateRequest(lateId, approverEmployee.id);
    } else {
      await rejectLateRequest(lateId, approverEmployee.id);
    }

    // 4. Edit message in Telegram
    const employeeFullName = `${lateRequest.employee.first_name} ${lateRequest.employee.last_name}`.trim();
    const approverFullName = `${approverEmployee.first_name} ${approverEmployee.last_name}`.trim();
    const approverDisplay = fromUsername ? `@${fromUsername}` : approverFullName;
    const statusKh = isApprove ? '✅ បានអនុម័ត / Approved' : '❌ បានបដិសេធ / Rejected';

    const titleKh = isEarly
      ? `🏃‍♂️ <b>សំណើសុំចេញមុន / Early Leave Request</b>`
      : `⏰ <b>សំណើសុំយឺត / Late Request</b>`;

    const shiftLine = lateRequest.time_field && lateRequest.scheduled_time
      ? `🕐 <b>វេន / Shift:</b> ${lateRequest.time_field} (${lateRequest.scheduled_time})\n`
      : '';

    const newText =
      `${titleKh}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>បុគ្គលិក / Employee:</b> ${employeeFullName}\n` +
      `🏢 <b>ផ្នែក / Department:</b> ${lateRequest.employee.department_employee_department_idTodepartment?.name || 'N/A'}\n` +
      shiftLine +
      `📅 <b>កាលបរិច្ឆេទ / Date:</b> ${formatICTDate(lateRequest.request_date)} (${formatICTTime(lateRequest.request_date)})\n` +
      `💬 <b>មូលហេតុ / Reason:</b> ${lateRequest.reason || 'N/A'}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `<b>ស្ថានភាព / Status:</b> ${statusKh}\n` +
      `👔 <b>អនុម័តដោយ / Action By:</b> ${approverDisplay} (${approverFullName})`;

    await editDecisionMessage(token, chatId, messageId, newText, false);
    const toastKh = isEarly
      ? (isApprove ? 'បានអនុម័តសំណើសុំចេញមុន ✅' : 'បានបដិសេធសំណើសុំចេញមុន ❌')
      : (isApprove ? 'បានអនុម័តសំណើសុំយឺត ✅' : 'បានបដិសេធសំណើសុំយឺត ❌');
    await answerCallback(token, cbId, toastKh);

  } catch (err) {
    console.error('[TgApproval] handleLateApproval error:', err.message);
    await answerCallback(token, cbId, 'Error processing request.', true);
  }
};

/**
 * Handle /cancel_late, /cancel_early, /cancel command
 */
const handleCancelLateRequestCommand = async (token, msg, from, companyList) => {
  try {
    const fromUsername = from?.username ? from.username.replace(/^@/, '').toLowerCase().trim() : null;
    const fromChatId = from?.id ? from.id.toString().trim() : null;

    console.log(`[TgApproval] Processing cancel request from @${fromUsername} (ID: ${fromChatId})`);

    let employee = null;
    let targetCompany = null;

    for (const company of companyList) {
      const found = await findEmployeeByTelegramUsername(fromUsername, company.id, fromChatId);
      if (found) {
        employee = found;
        targetCompany = company;
        break;
      }
    }

    if (!employee || !targetCompany) {
      const userDisplay = fromUsername ? `@${fromUsername}` : (from?.first_name || "User");
      await sendTelegramMessage(
        token,
        msg.chat.id,
        `⚠️ <b>រកមិនឃើញគណនីបុគ្គលិក / Employee Not Found</b>\nគណនី Telegram (${userDisplay}) មិនទាន់បានភ្ជាប់ក្នុងប្រព័ន្ធ HR នៅឡើយទេ។`,
        { reply_to_message_id: msg.message_id }
      );
      return;
    }

    // Find the latest pending late / early request for this employee
    const pendingRequest = await prisma.laterequest.findFirst({
      where: {
        employee_id: employee.id,
        company_id: targetCompany.id,
        status: "pending",
      },
      orderBy: { created_at: "desc" },
      include: {
        employee: {
          include: {
            department_employee_department_idTodepartment: true,
          },
        },
      },
    });

    if (!pendingRequest) {
      await sendTelegramMessage(
        token,
        msg.chat.id,
        `ℹ️ <b>មិនមានសំណើដែលត្រូវលុបចោលទេ / No Pending Request</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `អ្នកមិនមានសំណើសុំយឺត ឬសុំចេញមុនដែលកំពុងរង់ចាំការអនុម័តទេ។\n` +
        `<i>You have no pending late or early leave requests to cancel.</i>`,
        { reply_to_message_id: msg.message_id }
      );
      return;
    }

    // Cancel in database
    const cancelRes = await cancelLateRequest(pendingRequest.id, employee.id);
    if (!cancelRes.result) {
      await sendTelegramMessage(token, msg.chat.id, `❌ ${cancelRes.message}`, {
        reply_to_message_id: msg.message_id,
      });
      return;
    }

    const employeeFullName = `${employee.first_name} ${employee.last_name}`.trim();
    const isEarly = pendingRequest.request_type === "EARLY";
    const typeLabelKh = isEarly ? "សំណើសុំចេញមុន" : "សំណើសុំយឺត";

    // Edit the existing Telegram message card in the group to remove buttons and show cancelled status
    if (pendingRequest.telegram_message_id && pendingRequest.telegram_chat_id) {
      const titleKh = isEarly
        ? `🏃‍♂️ <b>សំណើសុំចេញមុន / Early Leave Request</b>`
        : `⏰ <b>សំណើសុំយឺត / Late Request</b>`;

      const shiftLine = pendingRequest.time_field && pendingRequest.scheduled_time
        ? `🕐 <b>វេន / Shift:</b> ${pendingRequest.time_field} (${pendingRequest.scheduled_time})\n`
        : '';

      const cancelledText =
        `${titleKh}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>បុគ្គលិក / Employee:</b> ${employeeFullName}\n` +
        `🏢 <b>ផ្នែក / Department:</b> ${pendingRequest.employee.department_employee_department_idTodepartment?.name || 'N/A'}\n` +
        shiftLine +
        `📅 <b>កាលបរិច្ឆេទ / Date:</b> ${formatICTDate(pendingRequest.request_date)} (${formatICTTime(pendingRequest.request_date)})\n` +
        `💬 <b>មូលហេតុ / Reason:</b> ${pendingRequest.reason || 'N/A'}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `<b>ស្ថានភាព / Status:</b> 🚫 <b>បានលុបចោលដោយបុគ្គលិក / Cancelled by Employee</b>`;

      await editDecisionMessage(token, pendingRequest.telegram_chat_id, pendingRequest.telegram_message_id, cancelledText, false);
    }

    // Acknowledge to user
    await sendTelegramMessage(
      token,
      msg.chat.id,
      `✅ <b>${typeLabelKh} #${pendingRequest.id} ត្រូវបានលុបចោលដោយជោគជ័យ</b>\n` +
      `<i>Your ${isEarly ? "early leave" : "late"} request has been successfully cancelled.</i>`,
      { reply_to_message_id: msg.message_id }
    );

  } catch (err) {
    console.error("[TgApproval] handleCancelLateRequestCommand error:", err.message);
    await sendTelegramMessage(token, msg.chat.id, "❌ Error cancelling request.", {
      reply_to_message_id: msg.message_id,
    });
  }
};

