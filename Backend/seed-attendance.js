import prisma from "./lib/prisma.js";

async function main() {
  try {
    console.log("[Seeder] Starting database lookup...");
    // 1. Fetch active employees excluding those with role 'Admin'
    const employees = await prisma.employee.findMany({
      where: {
        is_active: "active",
        OR: [
          { role_id: null },
          {
            role: {
              name: { not: "Admin" }
            }
          }
        ]
      },
      include: {
        company: true
      }
    });

    if (employees.length === 0) {
      console.log("[Seeder] No active, non-admin employees found.");
      return;
    }

    console.log(`[Seeder] Found ${employees.length} eligible employees:`, employees.map(e => `${e.first_name} ${e.last_name} (${e.id})`));

    // 2. Fetch time modes
    const timeModes = await prisma.timemode.findMany();
    const getModeId = (name, companyId) => {
      const mode = timeModes.find(tm => tm.company_id === companyId && tm.name.toLowerCase() === name.toLowerCase());
      return mode ? mode.id : null;
    };

    // 3. Find date range: Jan 1, 2026 to June 30, 2026 (today)
    const startDate = new Date("2026-01-01T00:00:00Z");
    const endDate = new Date(); // today
    endDate.setHours(23, 59, 59, 999);

    console.log(`[Seeder] Seeding from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // 4. Fetch all existing attendance records in this range to avoid duplicates
    console.log("[Seeder] Fetching existing attendance records to build cache...");
    const existingRecords = await prisma.attendancerecord.findMany({
      where: {
        work_at: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        employee_id: true,
        work_at: true
      }
    });

    // Build in-memory set of YYYY-MM-DD strings for quick checking
    const existingCache = new Set();
    for (const rec of existingRecords) {
      const dateKey = rec.work_at.toISOString().split('T')[0];
      existingCache.add(`${rec.employee_id}-${dateKey}`);
    }
    console.log(`[Seeder] Cached ${existingCache.size} existing check-in days.`);

    // 5. Generate dates array
    const dateList = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      // Check if it's Sunday (0)
      if (current.getDay() !== 0) {
        dateList.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    console.log(`[Seeder] Total workdays to process: ${dateList.length}`);

    // 6. Generate insertions
    const insertDataList = [];
    const pad = (n) => String(n).padStart(2, '0');

    for (const employee of employees) {
      const companyId = employee.company_id;
      const timeInId = getModeId('TimeIn', companyId);
      const lunchOutId = getModeId('LunchOut', companyId);
      const lunchInId = getModeId('LunchIn', companyId);
      const timeOutId = getModeId('TimeOut', companyId);

      if (!timeInId || !lunchOutId || !lunchInId || !timeOutId) {
        console.warn(`[Seeder] Missing one or more time modes (TimeIn, LunchOut, LunchIn, TimeOut) for company ID ${companyId}. Skipping employee ID ${employee.id}.`);
        continue;
      }

      for (const dateObj of dateList) {
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth();
        const dateVal = dateObj.getDate();
        const dateKey = `${year}-${pad(month + 1)}-${pad(dateVal)}`;

        // Skip if they already have attendance recorded for this date
        if (existingCache.has(`${employee.id}-${dateKey}`)) {
          continue;
        }

        // Generate TimeIn (target 08:00 AM Cambodia time, which is 01:00 AM UTC)
        // Let's randomize minutes: 07:45 - 08:15 (i.e. UTC 00:45 - 01:15)
        const inMins = Math.floor(Math.random() * 31) - 15;
        const checkInHour = 8;
        const checkInMin = 0 + inMins;
        const finalInMin = checkInMin < 0 ? 60 + checkInMin : checkInMin;
        const finalInHour = checkInMin < 0 ? checkInHour - 1 : checkInHour;
        const isLate = (finalInHour > 8 || (finalInHour === 8 && finalInMin > 0));
        const checkInDate = new Date(Date.UTC(year, month, dateVal, finalInHour - 7, finalInMin, Math.floor(Math.random() * 60)));

        insertDataList.push({
          employee_id: employee.id,
          time_mode_id: timeInId,
          status: isLate ? 'late' : 'present',
          type: 'FINGER',
          work_at: checkInDate,
          is_late: isLate,
          is_early: false,
          created_at: checkInDate,
          updated_at: checkInDate
        });

        // Generate LunchOut (target 12:00 PM Cambodia time, which is 05:00 AM UTC)
        // Randomize: 11:55 - 12:10 (i.e. UTC 04:55 - 05:10)
        const loMins = Math.floor(Math.random() * 16) - 5;
        const checkLOHour = 12;
        const checkLOMin = 0 + loMins;
        const finalLOMin = checkLOMin < 0 ? 60 + checkLOMin : checkLOMin;
        const finalLOHour = checkLOMin < 0 ? checkLOHour - 1 : checkLOHour;
        const checkLODate = new Date(Date.UTC(year, month, dateVal, finalLOHour - 7, finalLOMin, Math.floor(Math.random() * 60)));

        insertDataList.push({
          employee_id: employee.id,
          time_mode_id: lunchOutId,
          status: 'present',
          type: 'FINGER',
          work_at: checkLODate,
          is_late: false,
          is_early: false,
          created_at: checkLODate,
          updated_at: checkLODate
        });

        // Generate LunchIn (target 01:00 PM Cambodia time = 13:00, which is 06:00 AM UTC)
        // Randomize: 12:55 - 13:05 (i.e. UTC 05:55 - 06:05)
        const liMins = Math.floor(Math.random() * 11) - 5;
        const checkLIHour = 13;
        const checkLIMin = 0 + liMins;
        const finalLIMin = checkLIMin < 0 ? 60 + checkLIMin : checkLIMin;
        const finalLIHour = checkLIMin < 0 ? checkLIHour - 1 : checkLIHour;
        const checkLIDate = new Date(Date.UTC(year, month, dateVal, finalLIHour - 7, finalLIMin, Math.floor(Math.random() * 60)));

        insertDataList.push({
          employee_id: employee.id,
          time_mode_id: lunchInId,
          status: 'present',
          type: 'FINGER',
          work_at: checkLIDate,
          is_late: false,
          is_early: false,
          created_at: checkLIDate,
          updated_at: checkLIDate
        });

        // Generate TimeOut (target 05:00 PM Cambodia time = 17:00, which is 10:00 AM UTC)
        // Randomize: 17:00 - 17:15 (i.e. UTC 10:00 - 10:15)
        const outMins = Math.floor(Math.random() * 16);
        const checkOutHour = 17;
        const checkOutMin = 0 + outMins;
        const checkOutDate = new Date(Date.UTC(year, month, dateVal, checkOutHour - 7, checkOutMin, Math.floor(Math.random() * 60)));

        insertDataList.push({
          employee_id: employee.id,
          time_mode_id: timeOutId,
          status: 'present',
          type: 'FINGER',
          work_at: checkOutDate,
          is_late: false,
          is_early: false,
          created_at: checkOutDate,
          updated_at: checkOutDate
        });
      }
    }

    console.log(`[Seeder] Prepared ${insertDataList.length} records to insert.`);

    if (insertDataList.length > 0) {
      const chunkSize = 500;
      let insertedCount = 0;
      for (let i = 0; i < insertDataList.length; i += chunkSize) {
        const chunk = insertDataList.slice(i, i + chunkSize);
        await prisma.attendancerecord.createMany({
          data: chunk
        });
        insertedCount += chunk.length;
        console.log(`[Seeder] Inserted chunk (${insertedCount}/${insertDataList.length})...`);
      }
      console.log(`[Seeder] Successfully seeded ${insertedCount} attendance records!`);
    } else {
      console.log("[Seeder] All workdays are already seeded. No records inserted.");
    }
  } catch (err) {
    console.error("[Seeder] Fatal error during seeding:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
