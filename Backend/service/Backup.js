import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import prisma from '../lib/prisma.js';
import { sendTelegramDocument } from './Telegram.js';

// Parses credentials from standard mysql connection URLs
const parseDatabaseUrl = (url) => {
  if (!url) return null;
  const regex = /mysql:\/\/([^:]+)(?::([^@]*))?@([^:/]+)(?::(\d+))?\/([^?#]+)/;
  const match = url.match(regex);
  if (!match) return null;
  return {
    user: match[1],
    password: match[2] ? decodeURIComponent(match[2]) : '',
    host: match[3],
    port: match[4] || '3306',
    database: match[5]
  };
};

export const runAndSendBackup = async (dateStr) => {
  const dbUrl = process.env.DATABASE_URL;
  const dbConfig = parseDatabaseUrl(dbUrl);
  if (!dbConfig) {
    console.error('[Backup] Could not parse DATABASE_URL from process.env');
    return false;
  }

  const backupDir = path.join(process.cwd(), 'public', 'uploads', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = `backup_${dbConfig.database}_${dateStr}.sql`;
  const backupPath = path.join(backupDir, backupFile);

  console.log(`[Backup] Generating backup to ${backupPath}...`);

  return new Promise((resolve) => {
    // Set password in env so it's not exposed in CLI arguments (safer)
    const execEnv = { ...process.env, MYSQL_PWD: dbConfig.password };

    // Try mariadb-dump first, fall back to mysqldump
    const dumpCmd = `mariadb-dump -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${dbConfig.database} > "${backupPath}"`;

    exec(dumpCmd, { env: execEnv }, (error) => {
      if (error) {
        console.warn('[Backup] mariadb-dump failed or was not found, trying mysqldump...');
        const fallbackCmd = `mysqldump -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${dbConfig.database} > "${backupPath}"`;
        
        exec(fallbackCmd, { env: execEnv }, (fallbackError) => {
          if (fallbackError) {
            console.error('[Backup] Database dump command failed completely:', fallbackError.message);
            resolve(false);
          } else {
            proceedToSend(backupPath, backupFile, resolve);
          }
        });
      } else {
        proceedToSend(backupPath, backupFile, resolve);
      }
    });
  });
};

const proceedToSend = async (backupPath, backupFile, resolve) => {
  try {
    if (!fs.existsSync(backupPath) || fs.statSync(backupPath).size === 0) {
      console.error('[Backup] Dump file is empty or missing.');
      cleanup(backupPath);
      return resolve(false);
    }

    // Fetch the company that has a bot token configured
    const company = await prisma.company.findFirst({
      where: { telegram_bot_token: { not: null } },
      select: {
        telegram_bot_token: true,
        telegram_backup_group_id: true,
        telegram_group_id: true
      }
    });

    const chatId = company?.telegram_backup_group_id || company?.telegram_group_id || process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!chatId) {
      console.error('[Backup] Target Telegram Chat ID/Group ID could not be resolved (no telegram_backup_group_id, telegram_group_id, or TELEGRAM_ADMIN_CHAT_ID).');
      cleanup(backupPath);
      return resolve(false);
    }

    const botToken = process.env.TELEGRAM_BACKUP_BOT_TOKEN || company?.telegram_bot_token;
    if (!botToken) {
      console.error('[Backup] No Telegram bot token available.');
      cleanup(backupPath);
      return resolve(false);
    }

    const caption = `💾 <b>Database Backup</b>\n📅 Date: ${new Date().toISOString().split('T')[0]}\n📄 File: <code>${backupFile}</code>`;
    
    console.log(`[Backup] Sending database backup to Telegram chat ID: ${chatId}...`);
    const sent = await sendTelegramDocument(botToken, chatId, backupPath, caption);
    
    if (sent) {
      console.log('[Backup] Database backup sent successfully to Telegram.');
    } else {
      console.error('[Backup] Failed to send database backup via Telegram.');
    }

    cleanup(backupPath);
    resolve(!!sent);
  } catch (err) {
    console.error('[Backup] Error during backup transmission:', err.message);
    cleanup(backupPath);
    resolve(false);
  }
};

const cleanup = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Backup] Temporary file ${filePath} cleaned up.`);
    }
  } catch (err) {
    console.error('[Backup] Clean up failed:', err.message);
  }
};

let lastBackupDate = '';

export const checkAndRunDatabaseBackup = async () => {
  try {
    const rawNow = new Date();
    // Use Asia/Phnom_Penh (GMT+7)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(rawNow);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    
    const todayStr = `${year}-${month}-${day}`;
    const currentTimeStr = `${hour}:${minute}`;

    // Run at 6:00 PM ICT
    if (currentTimeStr === '18:00' && lastBackupDate !== todayStr) {
      lastBackupDate = todayStr;
      console.log(`[Backup] Starting scheduled database backup for ${todayStr}...`);
      await runAndSendBackup(todayStr);
    }
  } catch (err) {
    console.error('[Backup] checkAndRunDatabaseBackup error:', err.message);
  }
};
