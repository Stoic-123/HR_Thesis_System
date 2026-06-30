import prisma from "../lib/prisma.js";
import { clockAttendance, recordOnlineAttendance } from "../service/Attendance.js";
import { addAuditLog } from "../service/AuditLog.js";
import { calculateDistance } from "../utils/geo.js";
import { sendTelegramMessage, sendTelegramPhoto, buildClockMessage, buildOnlineMessage } from "../service/Telegram.js";
import { sendApprovalRequest } from "../service/TelegramApproval.js";
import path from "path";
import { Jimp } from "jimp";
import { toICTDate, formatICTDate } from "../utils/timezone.js";

const ATTENDANCE_GRACE_MINUTES = 10;

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return null;
  const [hh, mm] = timeStr.split(":");
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};
const inferTimeFieldFromTimeMode = (timeMode) => {
  const hay = `${timeMode?.name || ""} ${timeMode?.remark || ""}`.toLowerCase();
  const normalized = hay.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

  if (normalized.includes("lunch out") || normalized.includes("lunchout") || normalized.includes("break out") || normalized.includes("lunch_out")) return "lunch_out";
  if (normalized.includes("lunch in") || normalized.includes("lunchin") || normalized.includes("break in") || normalized.includes("lunch_in")) return "lunch_in";
  if (normalized.includes("time out") || normalized.includes("timeout") || normalized.includes("check out") || normalized.includes("clock out") || normalized.includes("time_out")) return "time_out";
  if (normalized.includes("time in") || normalized.includes("timein") || normalized.includes("check in") || normalized.includes("clock in") || normalized.includes("time_in")) return "time_in";

  return null;
};

const findTimeModeForField = async (company_id, timeField) => {
  try {
    const modes = await prisma.timemode.findMany({
      where: { company_id: parseInt(company_id) },
    });

    const matchingMode = modes.find((m) => {
      const hay = `${m.name || ""} ${m.remark || ""}`.toLowerCase();
      const normalized = hay.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

      if (timeField === "lunch_out") {
        return normalized.includes("lunch out") || normalized.includes("lunchout") || normalized.includes("break out") || normalized.includes("lunch_out");
      }
      if (timeField === "lunch_in") {
        return normalized.includes("lunch in") || normalized.includes("lunchin") || normalized.includes("break in") || normalized.includes("lunch_in");
      }
      if (timeField === "time_out") {
        return normalized.includes("time out") || normalized.includes("timeout") || normalized.includes("check out") || normalized.includes("clock out") || normalized.includes("time_out");
      }
      if (timeField === "time_in") {
        return normalized.includes("time in") || normalized.includes("timein") || normalized.includes("check in") || normalized.includes("clock in") || normalized.includes("time_in");
      }
      return false;
    });

    return matchingMode || null;
  } catch (error) {
    console.error("Error finding time mode for field:", error);
    return null;
  }
};

const inferTimeFieldFromSchedule = (timeSheet, nowMinutes, clockedFields = new Set()) => {
  if (!timeSheet) return null;

  const timeIn   = parseTimeToMinutes(timeSheet.time_in);
  const lunchOut = parseTimeToMinutes(timeSheet.lunch_out);
  const lunchIn  = parseTimeToMinutes(timeSheet.lunch_in);
  const timeOut  = parseTimeToMinutes(timeSheet.time_out);

  console.log("[Schedule Debug]", { timeIn, lunchOut, lunchIn, timeOut, nowMinutes, clockedFields: Array.from(clockedFields) });

  const WINDOW = 120;

  // ── time_in window ──────────────────────────────────────────────
  // Covers: (time_in - grace) → midpoint between time_in and lunch_out
  // After the midpoint the employee is clearly past check-in territory.
  const timeInEnd =
    lunchOut !== null
      ? Math.floor((timeIn + lunchOut) / 2)
      : timeIn + WINDOW;

  if (
    timeIn !== null &&
    nowMinutes >= timeIn - ATTENDANCE_GRACE_MINUTES &&
    nowMinutes <= timeInEnd
  ) {
    if (!clockedFields.has("time_in")) {
      return "time_in";
    }
  }

  // ── lunch_out / lunch_in ─────────────────────────────────────────
  // The schedule defines a break block: lunch_out (start) → lunch_in (end).
  // We split that block at the midpoint:
  //   • Before midpoint → employee is leaving for lunch (lunch_out)
  //   • After midpoint  → employee is returning from lunch (lunch_in)
  // This naturally handles early/late scanning on either side.
  if (lunchOut !== null && lunchIn !== null) {
    const midpoint = Math.floor((lunchOut + lunchIn) / 2);

    // If within the overall lunch break window
    if (nowMinutes >= lunchOut - WINDOW && nowMinutes <= lunchIn + WINDOW) {
      const hasLunchOut = clockedFields.has("lunch_out");
      const hasLunchIn = clockedFields.has("lunch_in");

      if (!hasLunchOut) {
        return "lunch_out";
      } else if (!hasLunchIn) {
        return "lunch_in";
      }
    }

    // Fallback standard checks:
    // lunch_out: from WINDOW before lunch_out up to the midpoint
    if (nowMinutes >= lunchOut - WINDOW && nowMinutes <= midpoint) {
      return "lunch_out";
    }

    // lunch_in: from midpoint+1 up to WINDOW after lunch_in
    if (nowMinutes > midpoint && nowMinutes <= lunchIn + WINDOW) {
      return "lunch_in";
    }
  } else if (lunchOut !== null) {
    // Only lunch_out defined — simple window around it
    if (nowMinutes >= lunchOut - WINDOW && nowMinutes <= lunchOut + WINDOW) {
      return "lunch_out";
    }
  } else if (lunchIn !== null) {
    // Only lunch_in defined — simple window around it
    if (nowMinutes >= lunchIn - WINDOW && nowMinutes <= lunchIn + WINDOW) {
      return "lunch_in";
    }
  }

  // ── time_out window ──────────────────────────────────────────────
  // Covers: from WINDOW before time_out until end of day.
  if (
    timeOut !== null &&
    nowMinutes >= timeOut - WINDOW
  ) {
    return "time_out";
  }

  return null;
};

const getTodayKey = (dateObj) => {
  const ictDate = toICTDate(dateObj);
  const dayIdx = ictDate.getUTCDay();
  if (dayIdx === 0) return "sunday";
  if (dayIdx === 1) return "monday";
  if (dayIdx === 2) return "tuesday";
  if (dayIdx === 3) return "wednesday";
  if (dayIdx === 4) return "thursday";
  if (dayIdx === 5) return "friday";
  return "saturday";
};

const getEmployeeScheduleForToday = async (employee_id, company_id, dateObj) => {
  const includeDayOfWeek = {
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
  };

  const profile = await prisma.employeeworkingprofile.findUnique({
    where: { employee_id },
    ...includeDayOfWeek,
  });

  const dayOfWeekConfig =
    profile?.dayofweek ||
    (await prisma.dayofweek.findFirst({
      where: { company_id: company_id, is_default: true },
      include: includeDayOfWeek.include.dayofweek.include,
    }));

  if (!dayOfWeekConfig) {
    return { dayOfWeekConfig: null, timeSheet: null };
  }

  const dayKey = getTodayKey(dateObj);
  const timeSheet = dayOfWeekConfig[dayKey] || null;

  return {
    dayOfWeekConfig: {
      id: dayOfWeekConfig.id,
      name: dayOfWeekConfig.name,
      code: dayOfWeekConfig.code,
      is_default: dayOfWeekConfig.is_default,
    },
    timeSheet,
  };
};

const computeAttendanceMeta = async ({ employee_id, company_id, timeMode, workAt }) => {
  const schedule = await getEmployeeScheduleForToday(employee_id, company_id, workAt);
  const ictDate = toICTDate(workAt);
  const nowMinutes = ictDate.getUTCHours() * 60 + ictDate.getUTCMinutes();

  const targetDateStr = formatICTDate(workAt);
  const startOfDay = new Date(`${targetDateStr}T00:00:00.000+07:00`);
  const endOfDay = new Date(`${targetDateStr}T23:59:59.999+07:00`);

  const todayRecords = await prisma.attendancerecord.findMany({
    where: {
      employee_id,
      work_at: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      timemode: true,
    },
  });

  const clockedFields = new Set();
  for (const record of todayRecords) {
    const field = inferTimeFieldFromTimeMode(record.timemode);
    if (field) {
      clockedFields.add(field);
    }
  }

  const timeField =
    inferTimeFieldFromSchedule(schedule?.timeSheet, nowMinutes, clockedFields) ??
    inferTimeFieldFromTimeMode(timeMode);
  const expectedTime = timeField ? schedule?.timeSheet?.[timeField] : null;
  const expectedMin = parseTimeToMinutes(expectedTime);
  const actualMin = ictDate.getUTCHours() * 60 + ictDate.getUTCMinutes();

  const isRequired =
    timeField === "time_in"
      ? schedule?.timeSheet?.require_time_in ?? false
      : timeField === "lunch_out"
        ? schedule?.timeSheet?.require_lunch_out ?? false
        : timeField === "lunch_in"
          ? schedule?.timeSheet?.require_lunch_in ?? false
          : timeField === "time_out"
            ? schedule?.timeSheet?.require_time_out ?? false
            : false;

  let is_late = false;
  let is_early = false;
  let status = "present";

  if (expectedMin !== null) {
    if (timeField === "time_in") {
      if (actualMin > expectedMin + ATTENDANCE_GRACE_MINUTES) {
        is_late = true;
        status = "late";
      }
    } else if (timeField === "time_out") {
      if (actualMin < expectedMin - ATTENDANCE_GRACE_MINUTES) {
        is_early = true;
      }
    } else if (timeField === "lunch_out") {
      if (actualMin < expectedMin - ATTENDANCE_GRACE_MINUTES) {
        is_early = true;
      }
    } else if (timeField === "lunch_in") {
      if (actualMin > expectedMin + ATTENDANCE_GRACE_MINUTES) {
        is_late = true;
        status = "late";
      }
    }
  }

  return {
    status,
    meta: { is_late, is_early, work_at: workAt },
    schedule: {
      dayOfWeek: schedule.dayOfWeekConfig,
      timeSheet: schedule.timeSheet,
      timeField,
      expectedTime,
      graceMinutes: ATTENDANCE_GRACE_MINUTES,
      isRequired,
    },
  };
};

export const getAttendanceReportController = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const employee_id = req.user.employee_id;
    const { date } = req.query;

    // Use the target date string (defaulting to the current ICT date)
    const targetDateStr = date || formatICTDate(new Date());
    if (date && isNaN(new Date(date).getTime())) {
      return res.status(400).json({ result: false, message: "Invalid date format" });
    }

    // Parse the date range in local ICT time zone and map to UTC boundaries
    const startOfDay = new Date(`${targetDateStr}T00:00:00.000+07:00`);
    const endOfDay = new Date(`${targetDateStr}T23:59:59.999+07:00`);

    // Fetch user role and department to check access permissions
    const currentEmployee = await prisma.employee.findUnique({
      where: { id: employee_id },
      include: { role: true },
    });

    const isHrOrAdmin =
      currentEmployee?.role?.name?.toLowerCase().includes("admin") ||
      currentEmployee?.role?.name?.toLowerCase().includes("hr");

    const whereClause = {
      work_at: { gte: startOfDay, lte: endOfDay },
      employee: { company_id: parseInt(company_id) },
    };

    // Restrict query to the manager's department if not Admin or HR
    if (!isHrOrAdmin && currentEmployee?.department_id) {
      whereClause.employee.department_id = currentEmployee.department_id;
    }

    // Fetch all active time modes of the company for dynamic columns
    const timeModes = await prisma.timemode.findMany({
      where: { company_id: parseInt(company_id) },
      orderBy: { id: "asc" },
    });

    // Fetch all attendance records matching the filter criteria on this date
    const records = await prisma.attendancerecord.findMany({
      where: whereClause,
      include: {
        employee: {
          select: { id: true, first_name: true, last_name: true },
        },
        timemode: {
          select: { id: true, name: true, remark: true },
        },
      },
      orderBy: { work_at: "asc" },
    });

    // Classify a time mode name into time_in / lunch_out / lunch_in / time_out
    const classifyTimeMode = (mode) => {
      const hay = `${mode?.name || ""} ${mode?.remark || ""}`.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
      if (hay.includes("lunch out") || hay.includes("lunchout") || hay.includes("break out")) return "lunch_out";
      if (hay.includes("lunch in") || hay.includes("lunchin") || hay.includes("break in")) return "lunch_in";
      if (hay.includes("time out") || hay.includes("timeout") || hay.includes("check out") || hay.includes("clock out")) return "time_out";
      if (hay.includes("time in") || hay.includes("timein") || hay.includes("check in") || hay.includes("clock in")) return "time_in";
      return null;
    };

    // Group records by employee_id
    const employeeMap = {};
    records.forEach((r) => {
      const empId = r.employee_id;
      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          employee: r.employee,
          records: [],
          scans: {},
          timeIn: null,
          timeOut: null,
          isLate: false,
          isEarly: false,
          status: "present",
        };
      }
      const entry = employeeMap[empId];
      entry.records.push(r);

      const field = classifyTimeMode(r.timemode);
      
      // Calculate scan time using local ICT timezone
      const ictWorkAt = toICTDate(r.work_at);
      const timeStr = `${String(ictWorkAt.getUTCHours()).padStart(2, '0')}:${String(ictWorkAt.getUTCMinutes()).padStart(2, '0')}`;

      // Populate dynamic scan map
      entry.scans[r.time_mode_id] = {
        time: timeStr,
        is_late: r.is_late || false,
        is_early: r.is_early || false,
        status: r.status,
      };

      if (field === "time_in" && !entry.timeIn) {
        entry.timeIn = timeStr;
        if (r.is_late) entry.isLate = true;
        if (r.status === "late") entry.status = "late";
      }
      if (field === "time_out") {
        entry.timeOut = timeStr;
        if (r.is_early) entry.isEarly = true;
      }
      // Fallback: if we haven't captured time_in/time_out yet, use first/last record
      if (!entry.timeIn && field !== "time_out") {
        entry.timeIn = timeStr;
        if (r.is_late) entry.isLate = true;
        if (r.status === "late") entry.status = "late";
      }
      if (field === "time_out" || (!entry.timeOut && entry.timeIn && entry.records.length > 1)) {
        entry.timeOut = timeStr;
      }
    });

    // Build the rows array
    const rows = Object.values(employeeMap).map((entry) => {
      let status;
      if (entry.status === "late" || entry.isLate) {
        status = "late";
      } else if (entry.isEarly) {
        status = "early";
      } else {
        status = "present";
      }
      return {
        employee_id: entry.employee.id,
        employee: `${entry.employee.first_name} ${entry.employee.last_name}`,
        date: targetDateStr,
        checkIn: entry.timeIn || "--:--",
        checkOut: entry.timeOut || "--:--",
        scans: entry.scans,
        status,
      };
    });

    // Compute summary stats
    const totalCheckIns = rows.length;
    const lateCount = rows.filter((r) => r.status === "late").length;
    const presentCount = rows.filter((r) => r.status === "present").length;
    const onTimeRate = totalCheckIns > 0 ? Math.round((presentCount / totalCheckIns) * 100) : 0;

    return res.status(200).json({
      result: true,
      data: {
        date: targetDateStr,
        timeModes: timeModes.map(tm => ({
          id: tm.id,
          name: tm.name,
          remark: tm.remark
        })),
        summary: {
          totalCheckIns,
          onTimeRate,
          lateCount,
        },
        rows,
      },
    });
  } catch (error) {
    console.error("Error getting attendance report:", error);
    return res.status(500).json({
      result: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getAttendanceRecordsController = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { date } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: user_id },
      include: { employee: true },
    });

    if (!user || !user.employee) {
      return res.status(404).json({
        result: false,
        message: "Employee profile not found for this user",
      });
    }

    // Build where clause — filter to a specific day when `date` is provided
    const where = { employee_id: user.employee.id };
    if (date) {
      if (!isNaN(new Date(date).getTime())) {
        const start = new Date(`${date}T00:00:00.000+07:00`);
        const end = new Date(`${date}T23:59:59.999+07:00`);
        where.work_at = { gte: start, lte: end };
      }
    }

    const records = await prisma.attendancerecord.findMany({
      where,
      include: { timemode: true },
      orderBy: { work_at: "asc" },
    });

    return res.status(200).json({
      result: true,
      message: "Attendance records retrieved successfully",
      data: records,
    });
  } catch (error) {
    console.error("Error getting attendance records:", error);
    return res.status(500).json({
      result: false,
      message: error.message || "Internal server error",
    });
  }
};

export const clockController = async (req, res) => {
  try {
    const { time_mode_id, latitude, longitude, isMocked, type } = req.body;
    const user_id = req.user.id;
    const company_id = req.user.company_id;

    if (!time_mode_id || !latitude || !longitude) {
      return res.status(400).json({
        result: false,
        message: "time_mode_id, latitude, and longitude are required",
      });
    }

    if (isMocked) {
      return res.status(400).json({
        result: false,
        message: "Fake GPS or Mock Location detected. Check-in denied.",
      });
    }

    // Parse incoming coordinates
    const incomingLat = parseFloat(latitude);
    const incomingLon = parseFloat(longitude);

    if (isNaN(incomingLat) || isNaN(incomingLon)) {
      return res.status(400).json({
        result: false,
        message: "Invalid latitude or longitude",
      });
    }

    // Query the user's employee record along with their specifically assigned locations
    const user = await prisma.user.findUnique({
      where: { id: user_id },
      include: {
        employee: {
          include: {
            location: true, // Primary location
            employeelocation: {
              include: { location: true },
            },
          },
        },
      },
    });

    if (!user || !user.employee) {
      return res.status(404).json({
        result: false,
        message: "Employee profile not found for this user",
      });
    }

    const employee = user.employee;

    // Enforce 5-minute cooldown between scans
    const lastRecord = await prisma.attendancerecord.findFirst({
      where: { employee_id: employee.id },
      orderBy: { work_at: "desc" },
    });

    if (lastRecord) {
      const timeDiffMs = new Date() - new Date(lastRecord.work_at);
      const limitMs = 5 * 60 * 1000; // 5 minutes
      if (timeDiffMs < limitMs) {
        const remainingSeconds = Math.ceil((limitMs - timeDiffMs) / 1000);
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        return res.status(400).json({
          result: false,
          message: `Please wait ${timeString} before scanning again.`,
        });
      }
    }

    let validLocations = [];

    // Add specifically assigned locations
    if (employee.location) {
      validLocations.push(employee.location);
    }
    
    if (employee.employeelocation && employee.employeelocation.length > 0) {
      employee.employeelocation.forEach((el) => {
        if (el.location) validLocations.push(el.location);
      });
    }

    // Fallback: If no specific locations assigned to employee, fetch all company locations
    if (validLocations.length === 0) {
      const companyLocations = await prisma.location.findMany({
        where: { company_id: company_id },
      });
      validLocations = companyLocations;
    }

    if (validLocations.length === 0) {
      return res.status(400).json({
        result: false,
        message: "No valid office locations configured for check-in.",
      });
    }

    // Verify distance against valid locations
    let isWithinRadius = false;
    let closestDistance = Infinity;

    for (const loc of validLocations) {
      if (loc.latitude && loc.longitude) {
        const targetLat = parseFloat(loc.latitude);
        const targetLon = parseFloat(loc.longitude);
        const radius = loc.radius || 300; // Default to 300 meters if not set

        if (!isNaN(targetLat) && !isNaN(targetLon)) {
          const distance = calculateDistance(incomingLat, incomingLon, targetLat, targetLon);
          if (distance < closestDistance) closestDistance = distance;

          if (distance <= radius) {
            isWithinRadius = true;
            break; // Found a valid location within range
          }
        }
      }
    }

    if (!isWithinRadius) {
      return res.status(400).json({
        result: false,
        message: `You are outside the permitted check-in area. (Closest office is ~${Math.round(closestDistance)} meters away)`,
      });
    }

    // Fetch the time mode to ensure it exists and belongs to the company
    const timeMode = await prisma.timemode.findFirst({
      where: {
        id: parseInt(time_mode_id),
        company_id: company_id,
      },
    });

    if (!timeMode) {
      return res.status(404).json({
        result: false,
        message: "Invalid time mode specified",
      });
    }

    const workAt = new Date();
    const computed = await computeAttendanceMeta({
      employee_id: employee.id,
      company_id,
      timeMode,
      workAt,
    });

    let finalTimeModeId = timeMode.id;
    let finalTimeModeName = timeMode.name;

    const timeField = computed.schedule.timeField;
    if (timeField) {
      const inferredMode = await findTimeModeForField(company_id, timeField);
      if (inferredMode) {
        finalTimeModeId = inferredMode.id;
        finalTimeModeName = inferredMode.name;
      }
    }

    const record = await clockAttendance(
      employee.id,
      finalTimeModeId,
      computed.status,
      type || "FINGER",
      computed.meta
    );

    // Add audit log
    await addAuditLog(
      user_id,
      company_id,
      "Attendance",
      "CLOCK",
      `Employee clocked ${finalTimeModeName}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    // Send Telegram notification (fire-and-forget — never blocks the response)
    try {
      const company = await prisma.company.findUnique({
        where: { id: company_id },
        select: {
          name: true,
          telegram_bot_token: true,
          telegram_group_id: true,
          telegram_attendance_group_id: true,
        },
      });
      const activeGroupId = company?.telegram_attendance_group_id || company?.telegram_group_id;
      if (company?.telegram_bot_token && activeGroupId) {
        const fullName = `${employee.first_name} ${employee.last_name}`.trim();
        const msg = buildClockMessage({
          employeeName: fullName,
          timeModeName: finalTimeModeName,
          workAt:       workAt,
          status:       computed.status,
          isLate:       computed.meta.is_late,
          isEarly:      computed.meta.is_early,
          companyName:  company.name,
        });
        sendTelegramMessage(company.telegram_bot_token, activeGroupId, msg);
      }
    } catch (tgErr) {
      console.error('[Telegram] Clock notification error:', tgErr.message);
    }

    return res.status(200).json({
      result: true,
      message: `Successfully clocked ${finalTimeModeName}`,
      data: record,
      schedule: computed.schedule,
    });
  } catch (error) {
    console.error("Error clocking attendance:", error);
    return res.status(500).json({
      result: false,
      message: error.message || "Internal server error",
    });
  }
};

export const onlineAttendanceController = async (req, res) => {
  try {
    const { remark, latitude, longitude, has_activity, time_mode_id } = req.body;
    const user_id = req.user.id;
    const company_id = req.user.company_id;

    // FormData sends everything as strings — coerce booleans explicitly
    const hasActivity = has_activity === true || has_activity === 'true';

    // Handle photo upload (multipart) — save to public/uploads/leaves/
    let savedPhotoPath = null;    // relative path stored in DB  e.g. /uploads/leaves/xxx.jpg
    let absolutePhotoPath = null; // absolute disk path for Telegram sendPhoto

    if (req.files && req.files.photo) {
      const file     = req.files.photo;
      const filename = `${Date.now()}_${file.name}`;
      const relPath  = `/uploads/leaves/${filename}`;
      const absPath  = path.join(process.cwd(), 'public', 'uploads', 'leaves', filename);
      await file.mv(absPath);

      // Compress: resize to max 800px wide, save as JPEG @ 70% quality
      // This keeps faces clear while cutting typical selfie size from ~2MB → ~80-150KB
      try {
        const img = await Jimp.fromFile(absPath);
        if (img.bitmap.width > 800) {
          img.resize({ w: 800 });
        }
        // Jimp v1: pass quality via write options
        await img.write(absPath, { quality: 70 });
      } catch (compressErr) {
        // Compression failure is non-fatal — the original file is still there
        console.error('[Compress] Failed to compress attendance photo:', compressErr.message);
      }

      savedPhotoPath    = relPath;
      absolutePhotoPath = absPath;
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        result: false,
        message: "latitude and longitude are required",
      });
    }

    // Parse incoming coordinates
    const incomingLat = parseFloat(latitude);
    const incomingLon = parseFloat(longitude);

    if (isNaN(incomingLat) || isNaN(incomingLon)) {
      return res.status(400).json({
        result: false,
        message: "Invalid latitude or longitude",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: user_id },
      include: {
        employee: {
          include: {
            location: true, // Primary location
            employeelocation: {
              include: { location: true },
            },
          },
        },
      },
    });

    if (!user || !user.employee) {
      return res.status(404).json({
        result: false,
        message: "Employee profile not found for this user",
      });
    }

    const employee = user.employee;

    // Check if this employee has location bypass enabled in their working profile
    const workingProfile = await prisma.employeeworkingprofile.findUnique({
      where: { employee_id: employee.id },
      select: { allow_online_bypass_location: true },
    });
    const bypassLocation = workingProfile?.allow_online_bypass_location === true;

    // Block new bypass scan while a previous approval is still pending
    if (bypassLocation && !hasActivity) {
      const existingPending = await prisma.onlineattendancepending.findFirst({
        where: {
          employee_id: employee.id,
          status: 'pending',
        },
      });
      if (existingPending) {
        return res.status(400).json({
          result: false,
          message: 'សំណើវត្តមានរបស់អ្នកកំពុងរង់ចាំការអនុម័ត។ សូមរង់ចាំដំណោះស្រាយ មុននឹងស្គែនម្តងទៀត។',
        });
      }
    }

    // Enforce 5-minute cooldown between scans for real check-ins
    if (!hasActivity) {
      const lastRecord = await prisma.attendancerecord.findFirst({
        where: { employee_id: employee.id },
        orderBy: { work_at: "desc" },
      });

      if (lastRecord) {
        const timeDiffMs = new Date() - new Date(lastRecord.work_at);
        const limitMs = 5 * 60 * 1000; // 5 minutes
        if (timeDiffMs < limitMs) {
          const remainingSeconds = Math.ceil((limitMs - timeDiffMs) / 1000);
          const minutes = Math.floor(remainingSeconds / 60);
          const seconds = remainingSeconds % 60;
          const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

          return res.status(400).json({
            result: false,
            message: `Please wait ${timeString} before checking in again.`,
          });
        }
      }
    }

    // Skip location enforcement if this employee has bypass enabled
    if (!bypassLocation) {
      let validLocations = [];

      if (employee.location) {
        validLocations.push(employee.location);
      }

      if (employee.employeelocation && employee.employeelocation.length > 0) {
        employee.employeelocation.forEach((el) => {
          if (el.location) validLocations.push(el.location);
        });
      }

      if (validLocations.length === 0) {
        const companyLocations = await prisma.location.findMany({
          where: { company_id: company_id },
        });
        validLocations = companyLocations;
      }

      if (validLocations.length === 0) {
        return res.status(400).json({
          result: false,
          message: "No valid office locations configured for online check-in.",
        });
      }

      let isWithinRadius = false;
      let closestDistance = Infinity;

      for (const loc of validLocations) {
        if (loc.latitude && loc.longitude) {
          const targetLat = parseFloat(loc.latitude);
          const targetLon = parseFloat(loc.longitude);
          const radius = loc.radius || 300;

          if (!isNaN(targetLat) && !isNaN(targetLon)) {
            const distance = calculateDistance(incomingLat, incomingLon, targetLat, targetLon);
            if (distance < closestDistance) closestDistance = distance;

            if (distance <= radius) {
              isWithinRadius = true;
              break;
            }
          }
        }
      }

      if (!isWithinRadius) {
        return res.status(400).json({
          result: false,
          message: `You are outside the permitted check-in area. (Closest office is ~${Math.round(closestDistance)} meters away)`,
        });
      }
    }

    const onlineRecord = await recordOnlineAttendance(
      user.employee.id,
      savedPhotoPath,
      remark,
      latitude,
      longitude,
      hasActivity
    );

    let attendanceRecord = null;
    let schedule = null;

    // ── BYPASS-LOCATION PATH: requires Telegram approval before creating attendance record ──
    if (bypassLocation && !hasActivity) {
      // Compute attendance meta now so we can store it for deferred processing
      const timeMode = time_mode_id
        ? await prisma.timemode.findFirst({ where: { id: parseInt(time_mode_id), company_id } })
        : await prisma.timemode.findFirst({ where: { company_id } });

      let computedMeta   = null;
      let finalTimeModeId = timeMode?.id ?? null;
      let timeModeName   = timeMode?.name ?? 'Online Check-In';

      if (timeMode) {
        const workAt   = new Date();
        const computed = await computeAttendanceMeta({
          employee_id: user.employee.id,
          company_id,
          timeMode,
          workAt,
        });
        schedule = computed.schedule;

        const timeField = computed.schedule?.timeField;
        if (timeField) {
          const inferredMode = await findTimeModeForField(company_id, timeField);
          if (inferredMode) { finalTimeModeId = inferredMode.id; }
        }

        computedMeta = {
          status:   computed.status,
          is_late:  computed.meta.is_late,
          is_early: computed.meta.is_early,
          work_at:  computed.meta.work_at,
          timeField: computed.schedule?.timeField,
        };
        timeModeName = timeField
          ? timeField.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          : timeModeName;
      }

      // Look up the employee's department manager telegram_username (needed before creating pending)
      // Path: employee.department_id → department.manager_id → employee.telegram_username
      let managerTelegramUsername = null;
      if (employee.department_id) {
        const dept = await prisma.department.findUnique({
          where: { id: employee.department_id },
          select: {
            employee_department_manager_idToemployee: {
              select: { telegram_username: true },
            },
          },
        });
        const managerUsername =
          dept?.employee_department_manager_idToemployee?.telegram_username;
        if (managerUsername) {
          managerTelegramUsername = managerUsername.replace(/^@/, '');
        }
      }

      // Save the pending approval record
      const pending = await prisma.onlineattendancepending.create({
        data: {
          company_id,
          employee_id:              user.employee.id,
          online_id:                onlineRecord.id,
          time_mode_id:             finalTimeModeId,
          photo_path:               savedPhotoPath,
          remark:                   remark || null,
          latitude,
          longitude,
          has_activity:             false,
          status:                   'pending',
          computed_meta:            computedMeta ?? {},
          manager_telegram_username: managerTelegramUsername || null,
        },
      });

      // Send approval request to Telegram
      const company = await prisma.company.findUnique({
        where: { id: company_id },
        select: {
          name: true,
          telegram_bot_token: true,
          telegram_group_id: true,
          telegram_attendance_group_id: true,
        },
      });
      const activeGroupId = company?.telegram_attendance_group_id || company?.telegram_group_id;

      if (company?.telegram_bot_token && activeGroupId) {
        const fullName = `${employee.first_name} ${employee.last_name}`.trim();
        const tgResult = await sendApprovalRequest(
          company.telegram_bot_token,
          activeGroupId,
          {
            pendingId:               pending.id,
            employeeName:            fullName,
            timeModeName,
            workAt:                  new Date(),
            remark:                  remark || undefined,
            companyName:             company.name,
            absolutePhotoPath:       absolutePhotoPath || null,
            latitude,
            longitude,
            managerTelegramUsername,
          }
        );

        // Store the message_id so we can edit it later
        if (tgResult?.messageId) {
          await prisma.onlineattendancepending.update({
            where: { id: pending.id },
            data:  { telegram_message_id: tgResult.messageId },
          });
        }
      }

      await addAuditLog(user_id, company_id, 'OnlineAttendance', 'PENDING',
        `Employee submitted bypass-location online attendance (pending approval)`,
        null, req.ip, req.headers['user-agent']);

      return res.status(200).json({
        result:  true,
        message: 'សំណើវត្តមានរបស់អ្នកត្រូវបានផ្ញើ។ សូមរង់ចាំការអនុម័ត។',
        data:    { online: onlineRecord, attendance: null, pending: true, schedule },
      });
    }

    // ── NORMAL PATH (no bypass, or has_activity) ────────────────────────────
    if (!hasActivity) {
      const timeMode = time_mode_id ? await prisma.timemode.findFirst({
        where: {
          id: parseInt(time_mode_id),
          company_id: company_id,
        },
      }) : await prisma.timemode.findFirst({
        where: { company_id: company_id },
      });

      if (timeMode) {
        const workAt = new Date();
        const computed = await computeAttendanceMeta({
          employee_id: user.employee.id,
          company_id,
          timeMode,
          workAt,
        });
        schedule = computed.schedule;

        let finalTimeModeId = timeMode.id;
        const timeField = computed.schedule?.timeField;
        if (timeField) {
          const inferredMode = await findTimeModeForField(company_id, timeField);
          if (inferredMode) {
            finalTimeModeId = inferredMode.id;
          }
        }

        attendanceRecord = await clockAttendance(
          user.employee.id,
          finalTimeModeId,
          computed.status,
          "ONLINE",
          computed.meta
        );
      }
    }
    await addAuditLog(
      user_id,
      company_id,
      "OnlineAttendance",
      "CREATE",
      `Employee recorded online attendance`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    // Send Telegram notification (fire-and-forget — never blocks the response)
    try {
      const company = await prisma.company.findUnique({
        where: { id: company_id },
        select: {
          name: true,
          telegram_bot_token: true,
          telegram_group_id: true,
          telegram_attendance_group_id: true,
        },
      });
      const activeGroupId = company?.telegram_attendance_group_id || company?.telegram_group_id;
      if (company?.telegram_bot_token && activeGroupId) {
        const fullName = `${employee.first_name} ${employee.last_name}`.trim();
        const timeModeName = schedule?.timeField
          ? schedule.timeField.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          : hasActivity ? 'Activity Update' : 'Online Check-In';
        const caption = buildOnlineMessage({
          employeeName: fullName,
          timeModeName: timeModeName,
          workAt:       new Date(),
          isLate:       false,
          remark:       remark || undefined,
          companyName:  company.name,
          hasActivity:  hasActivity,
        });

        if (absolutePhotoPath) {
          // Send photo with caption
          sendTelegramPhoto(company.telegram_bot_token, activeGroupId, absolutePhotoPath, caption);
        } else {
          // No photo — text only
          sendTelegramMessage(company.telegram_bot_token, activeGroupId, caption);
        }
      }
    } catch (tgErr) {
      console.error('[Telegram] Online attendance notification error:', tgErr.message);
    }

    return res.status(200).json({
      result: true,
      message: "Online attendance recorded successfully",
      data: {
        online: onlineRecord,
        attendance: attendanceRecord,
        schedule,
      },
    });
  } catch (error) {
    console.error("Error recording online attendance:", error);
    return res.status(500).json({
      result: false,
      message: error.message || "Internal server error",
    });
  }
};
