import dotenv from 'dotenv';
import path from 'path';
import prisma from './lib/prisma.js';

// Load from Backend/.env explicitly
dotenv.config({ path: path.join(process.cwd(), 'Backend', '.env') });

import { runAndSendBackup } from './service/Backup.js';

async function main() {
  console.log('=== Starting Database Backup Verification ===');
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  // Set mock backup group ID in DB company record for testing cascade resolution
  try {
    const testGroupId = '-999777555';
    console.log(`[Test] Setting company telegram_backup_group_id to ${testGroupId} in database...`);
    await prisma.company.update({
      where: { id: 3 },
      data: { telegram_backup_group_id: testGroupId }
    });
  } catch (err) {
    console.warn('[Test] Failed to update company record in database:', err.message);
  }

  const result = await runAndSendBackup('test_verify');
  console.log(`=== Verification Completed. Result: ${result} ===`);
  
  // Cleanup test group ID from database
  try {
    console.log('[Test] Cleaning up company telegram_backup_group_id from database...');
    await prisma.company.update({
      where: { id: 3 },
      data: { telegram_backup_group_id: null }
    });
  } catch (err) {
    console.error('[Test] Cleanup database update failed:', err.message);
  }
}

main();
