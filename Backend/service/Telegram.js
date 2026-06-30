/**
 * Telegram notification service
 *
 * Sends messages / photos to a Telegram group using the company's
 * bot token + group ID stored in the `company` table.
 */

import fs from 'fs';
import path from 'path';

const TELEGRAM_API = 'https://api.telegram.org';

// ─── Low-level helpers ────────────────────────────────────────────────────────

/**
 * Send a plain HTML text message.
 * Returns true on success, false on any error (never throws).
 */
export const sendTelegramMessage = async (botToken, chatId, text, options = {}) => {
  if (!botToken || !chatId || !text) return false;
  try {
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...options,
    };
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[Telegram] sendMessage failed:', err.description || res.status);
      return false;
    }
    const result = await res.json();
    return result; // Return the result so we can get message_id!
  } catch (e) {
    console.error('[Telegram] sendMessage error:', e.message);
    return false;
  }
};

/**
 * Send a photo with an HTML caption.
 * `photoPath` is an absolute path on disk.
 * Returns true on success, false on any error (never throws).
 */
export const sendTelegramPhoto = async (botToken, chatId, photoPath, caption, options = {}) => {
  if (!botToken || !chatId || !photoPath) return false;
  try {
    // Check file exists
    if (!fs.existsSync(photoPath)) {
      console.warn('[Telegram] Photo not found, falling back to text:', photoPath);
      return await sendTelegramMessage(botToken, chatId, caption, options);
    }

    const fileStream  = fs.createReadStream(photoPath);
    const filename    = path.basename(photoPath);
    const boundary    = `----TelegramBoundary${Date.now()}`;
    const CRLF        = '\r\n';

    // Manually build multipart/form-data so we don't need node-fetch / form-data package
    const metaFields = [
      { name: 'chat_id',    value: String(chatId) },
      { name: 'caption',    value: caption || '' },
      { name: 'parse_mode', value: 'HTML' },
    ];

    // Add options (like reply_markup)
    for (const [key, value] of Object.entries(options)) {
      if (key === 'reply_markup' && typeof value === 'object') {
        metaFields.push({ name: key, value: JSON.stringify(value) });
      } else {
        metaFields.push({ name: key, value: String(value) });
      }
    }

    // Collect the file buffer first so we can build the body in one pass
    const fileBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      fileStream.on('data', c => chunks.push(c));
      fileStream.on('end',  () => resolve(Buffer.concat(chunks)));
      fileStream.on('error', reject);
    });

    // Build multipart body
    const parts = [];
    for (const { name, value } of metaFields) {
      parts.push(
        Buffer.from(
          `--${boundary}${CRLF}` +
          `Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}` +
          `${value}${CRLF}`,
          'utf8'
        )
      );
    }
    // Photo part
    parts.push(
      Buffer.from(
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="photo"; filename="${filename}"${CRLF}` +
        `Content-Type: image/jpeg${CRLF}${CRLF}`,
        'utf8'
      )
    );
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

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[Telegram] sendPhoto failed:', err.description || res.status);
      // Fallback: send text only
      return await sendTelegramMessage(botToken, chatId, caption);
    }
    const result = await res.json();
    return result;
  } catch (e) {
    console.error('[Telegram] sendPhoto error:', e.message);
    // Fallback: try plain text
    try { return await sendTelegramMessage(botToken, chatId, caption); } catch { return false; }
  }
};

// ─── Message builders (Khmer) ─────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0');

const formatDateTime = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`
    };
  } catch (err) {
    console.error("Timezone format error in Telegram.js:", err.message);
    const ictDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return {
      date: `${ictDate.getUTCFullYear()}-${pad(ictDate.getUTCMonth() + 1)}-${pad(ictDate.getUTCDate())}`,
      time: `${pad(ictDate.getUTCHours())}:${pad(ictDate.getUTCMinutes())}`,
    };
  }
};

/**
 * Build message for fingerprint / QR check-in (clockController).
 */
export const buildClockMessage = ({
  employeeName,
  timeModeName,
  workAt,
  status,
  isLate,
  isEarly,
  companyName,
}) => {
  const { date, time } = formatDateTime(workAt || new Date());

  const modeLC  = (timeModeName || '').toLowerCase().replace(/_/g, ' ');
  let modeKh = 'ចូលការងារ (Check In)';
  let isOut = false;

  if (modeLC.includes('lunch out')) {
    modeKh = 'សម្រាកអាហារថ្ងៃត្រង់ (Lunch Out)';
    isOut = true;
  } else if (modeLC.includes('lunch in')) {
    modeKh = 'ចូលធ្វើការវិញ (Lunch In)';
    isOut = false;
  } else if (modeLC.includes('out') || modeLC.includes('check out')) {
    modeKh = 'ចេញពីការងារ (Check Out)';
    isOut = true;
  } else if (modeLC.includes('in') || modeLC.includes('check in')) {
    modeKh = 'ចូលការងារ (Check In)';
    isOut = false;
  }

  const icon = isOut ? '🔴' : '🟢';

  let alertStr = '';
  if (isLate) {
    alertStr = '\n⚠️ <b>មកយឺត (Late)</b>';
  } else if (isEarly) {
    alertStr = '\n⚠️ <b>ចេញមុន (Early)</b>';
  }

  let presentKh = 'បានចូលធ្វើការ';
  if (modeLC.includes('lunch out')) {
    presentKh = 'បានសម្រាក';
  } else if (modeLC.includes('lunch in')) {
    presentKh = 'បានចូលធ្វើការវិញ';
  } else if (isOut) {
    presentKh = 'បានចាកចេញ';
  }

  const statusMap = {
    present:  presentKh,
    late:     'មកយឺត',
    absent:   'អវត្តមាន',
    half_day: 'ពាក់កណ្តាលថ្ងៃ',
  };
  const statusKh = statusMap[status] || status || '';

  let msg = `${icon} <b>កំណត់ត្រាវត្តមាន</b>${alertStr}\n`;
  msg    += `━━━━━━━━━━━━━━━━━\n`;
  msg    += `👤 <b>បុគ្គលិក៖</b> ${employeeName}\n`;
  msg    += `🕐 <b>ប្រភេទ៖</b> ${modeKh}\n`;
  msg    += `⏰ <b>ម៉ោង៖</b> ${time}\n`;
  msg    += `📅 <b>កាលបរិច្ឆេទ៖</b> ${date}\n`;
  if (statusKh) {
    msg  += `📌 <b>ស្ថានភាព៖</b> ${statusKh}\n`;
  }
  msg    += `━━━━━━━━━━━━━━━━━\n`;
  msg    += `🏢 ${companyName || ''}`;

  return msg;
};

/**
 * Build caption for online attendance (sent alongside the selfie photo).
 */
export const buildOnlineMessage = ({
  employeeName,
  timeModeName,
  workAt,
  isLate,
  remark,
  companyName,
  hasActivity,
}) => {
  const { date, time } = formatDateTime(workAt || new Date());

  const icon   = hasActivity ? '📋' : '🌐';
  const typeKh = hasActivity ? 'របាយការណ៍សកម្មភាព' : 'វត្តមានអនឡាញ';
  const lateStr = isLate ? '\n⚠️ <b>មកយឺត</b>' : '';

  let msg = `${icon} <b>${typeKh}</b>${lateStr}\n`;
  msg    += `━━━━━━━━━━━━━━━━━\n`;
  msg    += `👤 <b>បុគ្គលិក៖</b> ${employeeName}\n`;
  if (timeModeName) {
    msg  += `🕐 <b>ប្រភេទ៖</b> ${timeModeName}\n`;
  }
  msg    += `⏰ <b>ម៉ោង៖</b> ${time}\n`;
  msg    += `📅 <b>កាលបរិច្ឆេទ៖</b> ${date}\n`;
  if (remark) {
    msg  += `💬 <b>កំណត់ចំណាំ៖</b> ${remark}\n`;
  }
  msg    += `━━━━━━━━━━━━━━━━━\n`;
  msg    += `🏢 ${companyName || ''}`;

  return msg;
};

/**
 * Delete a Telegram message from a group.
 * Returns true on success, false on error.
 */
export const deleteTelegramMessage = async (botToken, chatId, messageId) => {
  if (!botToken || !chatId || !messageId) return false;
  try {
    const payload = {
      chat_id: chatId,
      message_id: parseInt(messageId),
    };
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[Telegram] deleteMessage failed:', err.description || res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[Telegram] deleteMessage error:', e.message);
    return false;
  }
};

/**
 * Send a document/file (like a database backup SQL file).
 * `filePath` is an absolute path on disk.
 * Returns the API result on success, or false on error.
 */
export const sendTelegramDocument = async (botToken, chatId, filePath, caption = '', options = {}) => {
  if (!botToken || !chatId || !filePath) return false;
  try {
    if (!fs.existsSync(filePath)) {
      console.warn('[Telegram] Document not found:', filePath);
      return false;
    }

    const fileStream  = fs.createReadStream(filePath);
    const filename    = path.basename(filePath);
    const boundary    = `----TelegramBoundary${Date.now()}`;
    const CRLF        = '\r\n';

    const metaFields = [
      { name: 'chat_id',    value: String(chatId) },
      { name: 'caption',    value: caption || '' },
      { name: 'parse_mode', value: 'HTML' },
    ];

    for (const [key, value] of Object.entries(options)) {
      metaFields.push({ name: key, value: String(value) });
    }

    const fileBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      fileStream.on('data', c => chunks.push(c));
      fileStream.on('end',  () => resolve(Buffer.concat(chunks)));
      fileStream.on('error', reject);
    });

    const parts = [];
    for (const { name, value } of metaFields) {
      parts.push(
        Buffer.from(
          `--${boundary}${CRLF}` +
          `Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}` +
          `${value}${CRLF}`,
          'utf8'
        )
      );
    }

    parts.push(
      Buffer.from(
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="document"; filename="${filename}"${CRLF}` +
        `Content-Type: application/octet-stream${CRLF}${CRLF}`,
        'utf8'
      )
    );
    parts.push(fileBuffer);
    parts.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8'));

    const body = Buffer.concat(parts);

    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendDocument`, {
      method:  'POST',
      headers: {
        'Content-Type':   `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(body.length),
      },
      body,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[Telegram] sendDocument failed:', err.description || res.status);
      return false;
    }
    const result = await res.json();
    return result;
  } catch (e) {
    console.error('[Telegram] sendDocument error:', e.message);
    return false;
  }
};

