import prisma from "./lib/prisma.js";

async function main() {
  console.log("================================================================================");
  console.log("=== [Complete Attendance Seeder] Verifying Prerequisites & Seeding Profile/Records ===");
  console.log("================================================================================");

  // 1. Fetch Company
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error("❌ Error: No company found in database.");
    process.exit(1);
  }
  console.log(`[1/7] Verified Company: "${company.name}" (ID: ${company.id})`);

  // 2. Ensure Time Modes (TimeIn, LunchOut, LunchIn, TimeOut)
  const timeModeNames = [
    { name: "TimeIn", remark: "Morning Clock In" },
    { name: "LunchOut", remark: "Lunch Break Start" },
    { name: "LunchIn", remark: "Lunch Break End" },
    { name: "TimeOut", remark: "Evening Clock Out" },
  ];

  const timeModeMap = new Map();
  for (const tm of timeModeNames) {
    let mode = await prisma.timemode.findFirst({
      where: { company_id: company.id, name: tm.name },
    });
    if (!mode) {
      mode = await prisma.timemode.create({
        data: { name: tm.name, remark: tm.remark, company_id: company.id },
      });
      console.log(`  + Created TimeMode: ${tm.name}`);
    }
    timeModeMap.set(tm.name.toLowerCase(), mode.id);
  }
  console.log(`[2/7] Verified Time Modes (${timeModeMap.size} modes).`);

  // 3. Ensure Locations exist
  const locationsData = [
    { name: "Main Branch (សាខាធំ)", latitude: "11.5683", longitude: "104.9189", radius: 150 },
    { name: "Toul Kork Branch (សាខា ទួលគោក)", latitude: "11.5835", longitude: "104.8967", radius: 150 },
    { name: "Central Warehouse (ឃ្លាំងកណ្តាល)", latitude: "11.6020", longitude: "104.8723", radius: 200 },
  ];

  for (const loc of locationsData) {
    let existing = await prisma.location.findFirst({
      where: { company_id: company.id, name: loc.name },
    });
    if (!existing) {
      await prisma.location.create({
        data: { ...loc, company_id: company.id },
      });
      console.log(`  + Created Location: ${loc.name}`);
    }
  }
  console.log(`[3/7] Verified Locations.`);

  // 4. Ensure TimeSheets (Shifts) exist
  const timeSheetsData = [
    {
      name: "Full_time",
      code: "df_001",
      time_in: "08:00",
      lunch_out: "12:00",
      lunch_in: "13:00",
      time_out: "17:00",
      grace_period: 10,
      require_time_in: true,
      require_lunch_out: true,
      require_lunch_in: true,
      require_time_out: true,
    },
    {
      name: "Morning_Shift",
      code: "MS_001",
      time_in: "08:00",
      lunch_out: "14:00",
      lunch_in: null,
      time_out: null,
      grace_period: 10,
      require_time_in: true,
      require_lunch_out: true,
      require_lunch_in: false,
      require_time_out: false,
    },
    {
      name: "Afternoon_Shift",
      code: "AS_001",
      time_in: null,
      lunch_out: null,
      lunch_in: "14:00",
      time_out: "19:00",
      grace_period: 10,
      require_time_in: false,
      require_lunch_out: false,
      require_lunch_in: true,
      require_time_out: true,
    },
  ];

  const timeSheetMap = new Map();
  for (const ts of timeSheetsData) {
    let existing = await prisma.timesheet.findFirst({
      where: { company_id: company.id, name: ts.name },
    });
    if (!existing) {
      existing = await prisma.timesheet.create({
        data: { ...ts, company_id: company.id },
      });
      console.log(`  + Created TimeSheet: ${ts.name}`);
    } else {
      existing = await prisma.timesheet.update({
        where: { id: existing.id },
        data: { ...ts },
      });
    }
    timeSheetMap.set(ts.name, existing);
  }
  console.log(`[4/7] Verified TimeSheets (Full_time, Morning_Shift, Afternoon_Shift).`);

  // 5. Ensure Days of Week (Working Week Schedules) exist
  const fullTimeId = timeSheetMap.get("Full_time").id;
  const morningShiftId = timeSheetMap.get("Morning_Shift").id;
  const afternoonShiftId = timeSheetMap.get("Afternoon_Shift").id;

  const dayOfWeeksData = [
    {
      name: "Normal_Employee",
      code: "NW_001",
      monday_id: fullTimeId,
      tuesday_id: fullTimeId,
      wednesday_id: fullTimeId,
      thursday_id: fullTimeId,
      friday_id: fullTimeId,
      saturday_id: fullTimeId,
      sunday_id: null,
    },
    {
      name: "PartTime Morning",
      code: "PTM_001",
      monday_id: morningShiftId,
      tuesday_id: morningShiftId,
      wednesday_id: morningShiftId,
      thursday_id: morningShiftId,
      friday_id: morningShiftId,
      saturday_id: morningShiftId,
      sunday_id: null,
    },
    {
      name: "PartTime Afternoon",
      code: "PTA_001",
      monday_id: afternoonShiftId,
      tuesday_id: afternoonShiftId,
      wednesday_id: afternoonShiftId,
      thursday_id: afternoonShiftId,
      friday_id: afternoonShiftId,
      saturday_id: afternoonShiftId,
      sunday_id: null,
    },
  ];

  const dayOfWeekMap = new Map();
  for (const dow of dayOfWeeksData) {
    let existing = await prisma.dayofweek.findFirst({
      where: { company_id: company.id, name: dow.name },
    });
    if (!existing) {
      existing = await prisma.dayofweek.create({
        data: { ...dow, company_id: company.id },
      });
      console.log(`  + Created DayOfWeek Setup: ${dow.name}`);
    } else {
      existing = await prisma.dayofweek.update({
        where: { id: existing.id },
        data: { ...dow },
      });
    }
    dayOfWeekMap.set(dow.name, existing);
  }
  console.log(`[5/7] Verified Days of Week setups (${dayOfWeekMap.size} setups).`);

  // 6. Assign EmployeeWorkingProfile to ALL Active Employees
  const activeEmployees = await prisma.employee.findMany({
    where: { company_id: company.id, is_active: "active" },
  });

  const defaultSchedule = dayOfWeekMap.get("Normal_Employee");
  const morningSchedule = dayOfWeekMap.get("PartTime Morning");

  let createdProfilesCount = 0;
  for (const emp of activeEmployees) {
    const existingWp = await prisma.employeeworkingprofile.findUnique({
      where: { employee_id: emp.id },
    });

    const isMorningEmp =
      (emp.first_name && emp.first_name.toLowerCase().includes("saigon")) ||
      (emp.last_name && emp.last_name.toLowerCase().includes("saigon"));

    const targetDow = isMorningEmp ? morningSchedule.id : defaultSchedule.id;

    if (!existingWp) {
      await prisma.employeeworkingprofile.create({
        data: {
          employee_id: emp.id,
          day_of_week_id: targetDow,
          allow_online_bypass_location: false,
        },
      });
      createdProfilesCount++;
    }
  }
  console.log(`[6/7] Working Profiles verified for all ${activeEmployees.length} active employees (+${createdProfilesCount} newly assigned).`);

  // 7. Official Holidays 2026
  const cambodiaHolidays2026 = [
    { name: "International New Year Day (ទិវាចូលឆ្នាំសកល)", start: "2026-01-01", end: "2026-01-01" },
    { name: "Victory over Genocide Day (ទិវាជ័យជម្នះលើរបបប្រល័យពូជសាសន៍)", start: "2026-01-07", end: "2026-01-07" },
    { name: "International Women's Day (ទិវាអន្តរជាតិនារី)", start: "2026-03-08", end: "2026-03-08" },
    { name: "Khmer New Year (ពិធីបុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ)", start: "2026-04-13", end: "2026-04-16" },
    { name: "International Labor Day (ទិវាពលកម្មអន្តរជាតិ)", start: "2026-05-01", end: "2026-05-01" },
    { name: "Visak Bochea Day (ពិធីបុណ្យវិសាខបូជា)", start: "2026-05-02", end: "2026-05-02" },
    { name: "Royal Ploughing Ceremony (ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល)", start: "2026-05-06", end: "2026-05-06" },
    { name: "King Sihamoni's Birthday (ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម ព្រះមហាក្សត្រ)", start: "2026-05-14", end: "2026-05-14" },
    { name: "Queen Mother's Birthday (ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម សម្តេចម៉ែ)", start: "2026-06-18", end: "2026-06-18" },
    { name: "Constitutional Day (ទិវាប្រកាសរដ្ឋធម្មនុញ្ញ)", start: "2026-09-24", end: "2026-09-24" },
    { name: "Pchum Ben Festival (ពិធីបុណ្យភ្ជុំបិណ្ឌ)", start: "2026-10-10", end: "2026-10-12" },
    { name: "Commemoration of Late King Father (ទិវាគោរពព្រះវិញ្ញាណក្ខន្ធ ព្រះបរមរតនកោដ្ឋ)", start: "2026-10-15", end: "2026-10-15" },
    { name: "King's Coronation Day (ព្រះរាជពិធីគ្រងរាជសម្បត្តិ)", start: "2026-10-29", end: "2026-10-29" },
    { name: "National Independence Day (ទិវាបុណ្យឯករាជ្យជាតិ)", start: "2026-11-09", end: "2026-11-09" },
    { name: "Water Festival (ព្រះរាជពិធីបុណ្យអុំទូក បណ្តែតប្រទីប)", start: "2026-11-23", end: "2026-11-25" },
  ];

  const holidayDateSet = new Set();
  for (const h of cambodiaHolidays2026) {
    const sDate = new Date(`${h.start}T00:00:00Z`);
    const eDate = new Date(`${h.end}T23:59:59Z`);

    const existingH = await prisma.holiday.findFirst({
      where: { company_id: company.id, name: h.name, start_date: sDate },
    });
    if (!existingH) {
      await prisma.holiday.create({
        data: {
          company_id: company.id,
          name: h.name,
          start_date: sDate,
          end_date: eDate,
        },
      });
    }

    let d = new Date(sDate);
    while (d <= eDate) {
      holidayDateSet.add(d.toISOString().split("T")[0]);
      d.setDate(d.getDate() + 1);
    }
  }

  // 8. Generate Missing Attendance Records (Jan 1, 2026 to Present)
  console.log("[7/7] Generating and syncing attendance records matching each employee's exact shift schedule...");
  const startDate = new Date("2026-01-01T00:00:00Z");
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const existingRecords = await prisma.attendancerecord.findMany({
    where: {
      work_at: { gte: startDate, lte: endDate },
    },
    select: { employee_id: true, work_at: true },
  });

  const attendanceCache = new Set();
  for (const rec of existingRecords) {
    const dateKey = rec.work_at.toISOString().split("T")[0];
    attendanceCache.add(`${rec.employee_id}-${dateKey}`);
  }

  const pad = (n) => String(n).padStart(2, "0");
  const dateList = [];
  let curr = new Date(startDate);
  while (curr <= endDate) {
    const year = curr.getFullYear();
    const month = curr.getMonth();
    const dateVal = curr.getDate();
    const dateKey = `${year}-${pad(month + 1)}-${pad(dateVal)}`;

    // Skip Sundays and official holidays
    if (curr.getDay() !== 0 && !holidayDateSet.has(dateKey)) {
      dateList.push(new Date(curr));
    }
    curr.setDate(curr.getDate() + 1);
  }

  const timeInId = timeModeMap.get("timein");
  const lunchOutId = timeModeMap.get("lunchout");
  const lunchInId = timeModeMap.get("lunchin");
  const timeOutId = timeModeMap.get("timeout");

  const fullWorkingProfiles = await prisma.employeeworkingprofile.findMany({
    where: { employee: { company_id: company.id, is_active: "active" } },
    include: {
      dayofweek: {
        include: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true,
        },
      },
    },
  });

  const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const attendanceInserts = [];

  for (const wp of fullWorkingProfiles) {
    const empId = wp.employee_id;

    for (const dateObj of dateList) {
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();
      const dateVal = dateObj.getDate();
      const dayIndex = dateObj.getDay();
      const dayKey = dayKeys[dayIndex];
      const dateKey = `${year}-${pad(month + 1)}-${pad(dateVal)}`;

      if (attendanceCache.has(`${empId}-${dateKey}`)) continue;

      const timeSheet = wp.dayofweek ? wp.dayofweek[dayKey] : null;
      if (!timeSheet) continue; // Rest day

      // ── Punch 1: Start of Shift (TimeIn or LunchIn) ──
      if (timeSheet.time_in && timeSheet.require_time_in !== false) {
        const inMins = Math.floor(Math.random() * 20) - 10;
        const finalInMin = inMins < 0 ? 60 + inMins : inMins;
        const finalInHour = inMins < 0 ? 7 : 8;
        const isLate = finalInHour > 8 || (finalInHour === 8 && finalInMin > 5);
        const checkInDate = new Date(Date.UTC(year, month, dateVal, finalInHour - 7, finalInMin, Math.floor(Math.random() * 59)));

        attendanceInserts.push({
          employee_id: empId,
          time_mode_id: timeInId,
          status: isLate ? "late" : "present",
          type: "FINGER",
          work_at: checkInDate,
          is_late: isLate,
          is_early: false,
          created_at: checkInDate,
          updated_at: checkInDate,
        });
      }

      // ── Punch 2: Lunch Out (if required by timesheet) ──
      if (timeSheet.lunch_out && timeSheet.require_lunch_out !== false) {
        const loHour = parseInt(timeSheet.lunch_out.split(":")[0]) || 12;
        const loMins = Math.floor(Math.random() * 15);
        const checkLODate = new Date(Date.UTC(year, month, dateVal, loHour - 7, loMins, Math.floor(Math.random() * 59)));

        attendanceInserts.push({
          employee_id: empId,
          time_mode_id: lunchOutId,
          status: "present",
          type: "FINGER",
          work_at: checkLODate,
          is_late: false,
          is_early: false,
          created_at: checkLODate,
          updated_at: checkLODate,
        });
      }

      // ── Punch 3: Lunch In (if required by timesheet) ──
      if (timeSheet.lunch_in && timeSheet.require_lunch_in !== false) {
        const liHour = parseInt(timeSheet.lunch_in.split(":")[0]) || 13;
        const liMins = Math.floor(Math.random() * 10);
        const checkLIDate = new Date(Date.UTC(year, month, dateVal, liHour - 7, liMins, Math.floor(Math.random() * 59)));

        attendanceInserts.push({
          employee_id: empId,
          time_mode_id: lunchInId,
          status: "present",
          type: "FINGER",
          work_at: checkLIDate,
          is_late: false,
          is_early: false,
          created_at: checkLIDate,
          updated_at: checkLIDate,
        });
      }

      // ── Punch 4: Check Out (if required by timesheet) ──
      if (timeSheet.time_out && timeSheet.require_time_out !== false) {
        const toHour = parseInt(timeSheet.time_out.split(":")[0]) || 17;
        const outMins = Math.floor(Math.random() * 25);
        const checkOutDate = new Date(Date.UTC(year, month, dateVal, toHour - 7, outMins, Math.floor(Math.random() * 59)));

        attendanceInserts.push({
          employee_id: empId,
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
    }
  }

  if (attendanceInserts.length > 0) {
    for (let i = 0; i < attendanceInserts.length; i += 500) {
      const chunk = attendanceInserts.slice(i, i + 500);
      await prisma.attendancerecord.createMany({ data: chunk });
    }
    console.log(`[7/7] Successfully synced ${attendanceInserts.length} new attendance records.`);
  } else {
    console.log(`[7/7] Attendance records already fully populated and up to date.`);
  }

  console.log("================================================================================");
  console.log("=== [Complete Attendance Seeder] FINISHED SUCCESSFULLY!                      ===");
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("❌ Seeding Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
