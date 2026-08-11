import prisma from "./lib/prisma.js";

async function main() {
  try {
    console.log("==================================================================");
    console.log("=== [Seeder] Starting HR Data Fill (Attendance, Leave, Overtime) ===");
    console.log("=== Range: March 1, 2026 to August 9, 2026                      ===");
    console.log("==================================================================");

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

    console.log(`[Seeder] Found ${employees.length} active employees:`, employees.map(e => `${e.first_name} ${e.last_name} (ID: ${e.id})`).join(", "));

    const startDate = new Date("2026-03-01T00:00:00Z");
    const endDate = new Date("2026-08-09T23:59:59Z");
    const pad = (n) => String(n).padStart(2, "0");

    // -------------------------------------------------------------------------
    // SECTION 1: SEED ATTENDANCE
    // -------------------------------------------------------------------------
    console.log("\n--- 1. Processing Attendance Records ---");

    // Ensure time modes exist for each company
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
          console.log(`[Seeder] Created timemode '${mode.name}' for company '${company.name}'`);
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

    // Cache existing attendance records
    const existingAttendance = await prisma.attendancerecord.findMany({
      where: { work_at: { gte: startDate, lte: endDate } },
      select: { employee_id: true, work_at: true },
    });

    const attendanceCache = new Set();
    for (const rec of existingAttendance) {
      const dateKey = rec.work_at.toISOString().split("T")[0];
      attendanceCache.add(`${rec.employee_id}-${dateKey}`);
    }

    // Build workdays array (Monday to Saturday)
    const workdays = [];
    let currentDay = new Date(startDate);
    while (currentDay <= endDate) {
      if (currentDay.getDay() !== 0) { // Skip Sunday
        workdays.push(new Date(currentDay));
      }
      currentDay.setDate(currentDay.getDate() + 1);
    }

    const attendanceList = [];
    for (const emp of employees) {
      const cId = emp.company_id;
      const timeInId = getModeId("TimeIn", cId);
      const lunchOutId = getModeId("LunchOut", cId);
      const lunchInId = getModeId("LunchIn", cId);
      const timeOutId = getModeId("TimeOut", cId);

      if (!timeInId || !lunchOutId || !lunchInId || !timeOutId) continue;

      for (const dateObj of workdays) {
        const y = dateObj.getFullYear();
        const m = dateObj.getMonth();
        const d = dateObj.getDate();
        const dateKey = `${y}-${pad(m + 1)}-${pad(d)}`;

        if (attendanceCache.has(`${emp.id}-${dateKey}`)) continue;

        // TimeIn: 07:45 - 08:15 AM
        const inMins = Math.floor(Math.random() * 31) - 15;
        const checkInMin = inMins < 0 ? 60 + inMins : inMins;
        const checkInHour = inMins < 0 ? 7 : 8;
        const isLate = checkInHour > 8 || (checkInHour === 8 && checkInMin > 5);
        const inDate = new Date(Date.UTC(y, m, d, checkInHour - 7, checkInMin, Math.floor(Math.random() * 60)));

        attendanceList.push({
          employee_id: emp.id,
          time_mode_id: timeInId,
          status: isLate ? "late" : "present",
          type: "FINGER",
          work_at: inDate,
          is_late: isLate,
          is_early: false,
          created_at: inDate,
          updated_at: inDate,
        });

        // LunchOut: 11:55 AM - 12:10 PM
        const loMins = Math.floor(Math.random() * 16) - 5;
        const loMinFinal = loMins < 0 ? 60 + loMins : loMins;
        const loHourFinal = loMins < 0 ? 11 : 12;
        const loDate = new Date(Date.UTC(y, m, d, loHourFinal - 7, loMinFinal, Math.floor(Math.random() * 60)));

        attendanceList.push({
          employee_id: emp.id,
          time_mode_id: lunchOutId,
          status: "present",
          type: "FINGER",
          work_at: loDate,
          is_late: false,
          is_early: false,
          created_at: loDate,
          updated_at: loDate,
        });

        // LunchIn: 12:55 PM - 01:05 PM
        const liMins = Math.floor(Math.random() * 11) - 5;
        const liMinFinal = liMins < 0 ? 60 + liMins : liMins;
        const liHourFinal = liMins < 0 ? 12 : 13;
        const liDate = new Date(Date.UTC(y, m, d, liHourFinal - 7, liMinFinal, Math.floor(Math.random() * 60)));

        attendanceList.push({
          employee_id: emp.id,
          time_mode_id: lunchInId,
          status: "present",
          type: "FINGER",
          work_at: liDate,
          is_late: false,
          is_early: false,
          created_at: liDate,
          updated_at: liDate,
        });

        // TimeOut: 05:00 PM - 05:25 PM
        const outMins = Math.floor(Math.random() * 26);
        const outDate = new Date(Date.UTC(y, m, d, 17 - 7, outMins, Math.floor(Math.random() * 60)));

        attendanceList.push({
          employee_id: emp.id,
          time_mode_id: timeOutId,
          status: "present",
          type: "FINGER",
          work_at: outDate,
          is_late: false,
          is_early: false,
          created_at: outDate,
          updated_at: outDate,
        });
      }
    }

    if (attendanceList.length > 0) {
      const chunkSize = 500;
      let insertedCount = 0;
      for (let i = 0; i < attendanceList.length; i += chunkSize) {
        const chunk = attendanceList.slice(i, i + chunkSize);
        await prisma.attendancerecord.createMany({ data: chunk });
        insertedCount += chunk.length;
      }
      console.log(`✅ [Attendance] Successfully inserted ${insertedCount} attendance records.`);
    } else {
      console.log("ℹ️ [Attendance] All attendance workdays are already filled.");
    }

    // -------------------------------------------------------------------------
    // SECTION 2: SEED LEAVE RECORDS
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Processing Leave Records ---");

    // Ensure leave types exist for each company
    for (const company of companies) {
      const defaultLeaveTypes = [
        { name: "Annual Leave", code: "AL", default_balance: 18 },
        { name: "Sick Leave", code: "SL", default_balance: 7 },
        { name: "Special Leave", code: "SPL", default_balance: 5 },
      ];
      for (const lt of defaultLeaveTypes) {
        const exists = await prisma.leavetype.findFirst({
          where: { company_id: company.id, code: lt.code },
        });
        if (!exists) {
          await prisma.leavetype.create({
            data: {
              name: lt.name,
              code: lt.code,
              default_balance: lt.default_balance,
              company_id: company.id,
            },
          });
          console.log(`[Seeder] Created leave type '${lt.name}' for company '${company.name}'`);
        }
      }
    }

    const leaveTypes = await prisma.leavetype.findMany();
    const leaveReasons = [
      "Family event and personal matters",
      "Doctor appointment / Not feeling well",
      "Personal errands and home maintenance",
      "Attending family ceremony",
      "Rest and vacation day",
    ];

    let totalLeaveInserted = 0;
    for (const emp of employees) {
      const empLeaveCount = await prisma.leaverecord.count({
        where: {
          employee_id: emp.id,
          start_date: { gte: startDate, lte: endDate },
        },
      });

      if (empLeaveCount === 0) {
        const compLeaveTypes = leaveTypes.filter((lt) => lt.company_id === emp.company_id);
        if (compLeaveTypes.length === 0) continue;

        // Generate 2 approved leave records per employee across March-August
        const sampleMonths = [3, 5, 7]; // April, June, August
        for (const monthIdx of sampleMonths) {
          const lType = compLeaveTypes[Math.floor(Math.random() * compLeaveTypes.length)];
          const dayVal = Math.floor(Math.random() * 20) + 1;
          const lStart = new Date(Date.UTC(2026, monthIdx, dayVal, 1, 0, 0));
          const lEnd = new Date(Date.UTC(2026, monthIdx, dayVal + 1, 10, 0, 0));
          const reasonStr = leaveReasons[Math.floor(Math.random() * leaveReasons.length)];

          await prisma.leaverecord.create({
            data: {
              employee_id: emp.id,
              leave_type_id: lType.id,
              start_date: lStart,
              end_date: lEnd,
              reason: reasonStr,
              status: "approved",
              approved_by: emp.id,
              request_at: lStart,
              updated_at: lStart,
            },
          });
          totalLeaveInserted++;
        }
      }
    }
    console.log(`✅ [Leave] Successfully inserted ${totalLeaveInserted} approved leave records.`);

    // -------------------------------------------------------------------------
    // SECTION 3: SEED OVERTIME RECORDS
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Processing Overtime Records ---");

    const overtimeReasons = [
      "Project deadline delivery & testing",
      "Urgent system maintenance and backup",
      "Inventory audit and stock intake",
      "Handling evening high server workload",
      "Special task request from management",
    ];

    let totalOvertimeInserted = 0;
    for (const emp of employees) {
      const empOtCount = await prisma.overtime.count({
        where: {
          employee_id: emp.id,
          start_date: { gte: startDate, lte: endDate },
        },
      });

      if (empOtCount === 0) {
        // Generate 4 approved overtime entries for each employee
        const otMonths = [2, 3, 4, 6]; // March, April, May, July
        for (const mIdx of otMonths) {
          const dayVal = Math.floor(Math.random() * 22) + 2;
          const otStart = new Date(Date.UTC(2026, mIdx, dayVal, 10, 30, 0)); // 17:30 ICT
          const otEnd = new Date(Date.UTC(2026, mIdx, dayVal, 13, 0, 0));   // 20:00 ICT
          const otReason = overtimeReasons[Math.floor(Math.random() * overtimeReasons.length)];

          await prisma.overtime.create({
            data: {
              employee_id: emp.id,
              start_date: otStart,
              end_date: otEnd,
              reason: otReason,
              status: "approved",
              approved_by: emp.id,
              created_at: otStart,
              updated_at: otStart,
            },
          });
          totalOvertimeInserted++;
        }
      }
    }
    console.log(`✅ [Overtime] Successfully inserted ${totalOvertimeInserted} approved overtime records.`);

    console.log("\n==================================================================");
    console.log("🎉 [Seeder] HR DATA FILL COMPLETED SUCCESSFULLY!");
    console.log("==================================================================");

  } catch (err) {
    console.error("❌ [Seeder] Error populating HR data:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
