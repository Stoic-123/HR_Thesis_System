import prisma from "./lib/prisma.js";

async function main() {
  try {
    console.log("=== [Seeder] Starting Attendance Fill (March 1, 2026 - Present) ===");

    // 1. Fetch all active real employees
    const employees = await prisma.employee.findMany({
      where: {
        is_active: "active",
      },
      include: {
        company: true,
      },
    });

    if (employees.length === 0) {
      console.log("[Seeder] No active employees found.");
      return;
    }

    console.log(`[Seeder] Found ${employees.length} active employees.`);

    // 2. Fetch or create default time modes for each company if missing
    const companies = await prisma.company.findMany();
    for (const company of companies) {
      const defaultModes = [
        { name: "TimeIn", remark: "Morning Clock In" },
        { name: "LunchOut", remark: "Lunch Break Start" },
        { name: "LunchIn", remark: "Lunch Break End" },
        { name: "TimeOut", remark: "Evening Clock Out" },
      ];

      for (const mode of defaultModes) {
        const exists = await prisma.timemode.findFirst({
          where: {
            company_id: company.id,
            name: { equals: mode.name },
          },
        });
        if (!exists) {
          await prisma.timemode.create({
            data: {
              name: mode.name,
              company_id: company.id,
              remark: mode.remark,
            },
          });
          console.log(`[Seeder] Created missing timemode '${mode.name}' for company '${company.name}' (ID: ${company.id})`);
        }
      }
    }

    const timeModes = await prisma.timemode.findMany();
    const getModeId = (name, companyId) => {
      const mode = timeModes.find(
        (tm) => tm.company_id === companyId && tm.name.toLowerCase() === name.toLowerCase()
      );
      return mode ? mode.id : null;
    };

    // 3. Define date range: March 1, 2026 to August 9, 2026 (Today)
    const startDate = new Date("2026-03-01T00:00:00Z");
    const endDate = new Date("2026-08-09T23:59:59Z");

    console.log(`[Seeder] Date range: ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`);

    // 4. Fetch all existing attendance records in this range to identify blank days
    console.log("[Seeder] Checking existing attendance records...");
    const existingRecords = await prisma.attendancerecord.findMany({
      where: {
        work_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        employee_id: true,
        work_at: true,
      },
    });

    const existingCache = new Set();
    for (const rec of existingRecords) {
      const dateKey = rec.work_at.toISOString().split("T")[0];
      existingCache.add(`${rec.employee_id}-${dateKey}`);
    }
    console.log(`[Seeder] Cached ${existingCache.size} existing attendance records.`);

    // 5. Generate list of workdays (excluding Sundays)
    const dateList = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      // Exclude Sunday (0)
      if (current.getDay() !== 0) {
        dateList.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    console.log(`[Seeder] Total workdays in range (Mon-Sat): ${dateList.length}`);

    // 6. Generate insertions for all blank days
    const insertDataList = [];
    const pad = (n) => String(n).padStart(2, "0");

    for (const employee of employees) {
      const companyId = employee.company_id;
      const timeInId = getModeId("TimeIn", companyId);
      const lunchOutId = getModeId("LunchOut", companyId);
      const lunchInId = getModeId("LunchIn", companyId);
      const timeOutId = getModeId("TimeOut", companyId);

      if (!timeInId || !lunchOutId || !lunchInId || !timeOutId) {
        console.warn(`[Seeder] Missing timemodes for company ID ${companyId}. Skipping employee ${employee.first_name} ${employee.last_name} (${employee.id})`);
        continue;
      }

      let empInsertedDays = 0;
      for (const dateObj of dateList) {
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth();
        const dateVal = dateObj.getDate();
        const dateKey = `${year}-${pad(month + 1)}-${pad(dateVal)}`;

        // Skip if attendance already exists for this employee on this date
        if (existingCache.has(`${employee.id}-${dateKey}`)) {
          continue;
        }

        empInsertedDays++;

        // Randomize TimeIn: 07:45 - 08:15 AM ICT (UTC 00:45 - 01:15)
        const inMins = Math.floor(Math.random() * 31) - 15;
        const checkInHour = 8;
        const checkInMin = 0 + inMins;
        const finalInMin = checkInMin < 0 ? 60 + checkInMin : checkInMin;
        const finalInHour = checkInMin < 0 ? checkInHour - 1 : checkInHour;
        const isLate = finalInHour > 8 || (finalInHour === 8 && finalInMin > 5);
        const checkInDate = new Date(Date.UTC(year, month, dateVal, finalInHour - 7, finalInMin, Math.floor(Math.random() * 60)));

        insertDataList.push({
          employee_id: employee.id,
          time_mode_id: timeInId,
          status: isLate ? "late" : "present",
          type: "FINGER",
          work_at: checkInDate,
          is_late: isLate,
          is_early: false,
          created_at: checkInDate,
          updated_at: checkInDate,
        });

        // LunchOut: 11:55 - 12:10 PM ICT (UTC 04:55 - 05:10)
        const loMins = Math.floor(Math.random() * 16) - 5;
        const checkLOHour = 12;
        const checkLOMin = 0 + loMins;
        const finalLOMin = checkLOMin < 0 ? 60 + checkLOMin : checkLOMin;
        const finalLOHour = checkLOMin < 0 ? checkLOHour - 1 : checkLOHour;
        const checkLODate = new Date(Date.UTC(year, month, dateVal, finalLOHour - 7, finalLOMin, Math.floor(Math.random() * 60)));

        insertDataList.push({
          employee_id: employee.id,
          time_mode_id: lunchOutId,
          status: "present",
          type: "FINGER",
          work_at: checkLODate,
          is_late: false,
          is_early: false,
          created_at: checkLODate,
          updated_at: checkLODate,
        });

        // LunchIn: 12:55 - 01:05 PM ICT (UTC 05:55 - 06:05)
        const liMins = Math.floor(Math.random() * 11) - 5;
        const checkLIHour = 13;
        const checkLIMin = 0 + liMins;
        const finalLIMin = checkLIMin < 0 ? 60 + checkLIMin : checkLIMin;
        const finalLIHour = checkLIMin < 0 ? checkLIHour - 1 : checkLIHour;
        const checkLIDate = new Date(Date.UTC(year, month, dateVal, finalLIHour - 7, finalLIMin, Math.floor(Math.random() * 60)));

        insertDataList.push({
          employee_id: employee.id,
          time_mode_id: lunchInId,
          status: "present",
          type: "FINGER",
          work_at: checkLIDate,
          is_late: false,
          is_early: false,
          created_at: checkLIDate,
          updated_at: checkLIDate,
        });

        // TimeOut: 05:00 - 05:20 PM ICT (UTC 10:00 - 10:20)
        const outMins = Math.floor(Math.random() * 21);
        const checkOutHour = 17;
        const checkOutMin = 0 + outMins;
        const checkOutDate = new Date(Date.UTC(year, month, dateVal, checkOutHour - 7, checkOutMin, Math.floor(Math.random() * 60)));

        insertDataList.push({
          employee_id: employee.id,
          time_mode_id: timeOutId,
          status: "present",
          type: "FINGER",
          work_at: checkOutDate,
          is_late: false,
          is_early: false,
          created_at: checkOutDate,
          updated_at: checkOutDate,
        });
      }

      console.log(`[Seeder] Prepared ${empInsertedDays} missing days (${empInsertedDays * 4} records) for employee ${employee.first_name} ${employee.last_name}`);
    }

    console.log(`[Seeder] Total attendance records ready for insertion: ${insertDataList.length}`);

    if (insertDataList.length > 0) {
      const chunkSize = 500;
      let insertedCount = 0;
      for (let i = 0; i < insertDataList.length; i += chunkSize) {
        const chunk = insertDataList.slice(i, i + chunkSize);
        await prisma.attendancerecord.createMany({
          data: chunk,
        });
        insertedCount += chunk.length;
        console.log(`[Seeder] Inserted chunk (${insertedCount}/${insertDataList.length})...`);
      }
      console.log(`✅ [Seeder] Successfully filled ${insertedCount} attendance records for all active employees from March 2026 to present!`);
    } else {
      console.log("[Seeder] All workdays from March to present are already filled. No new records needed.");
    }
  } catch (err) {
    console.error("[Seeder] Fatal error during seeding:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
