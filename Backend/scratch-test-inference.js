import assert from "assert";

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return null;
  const [hh, mm] = timeStr.split(":");
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

export const inferTimeFieldFromSchedule = (timeSheet, nowMinutes, clockedFields = new Set()) => {
  if (!timeSheet) return null;

  const timeIn   = parseTimeToMinutes(timeSheet.time_in);
  const lunchOut = parseTimeToMinutes(timeSheet.lunch_out);
  const lunchIn  = parseTimeToMinutes(timeSheet.lunch_in);
  const timeOut  = parseTimeToMinutes(timeSheet.time_out);

  const hasTimeIn   = clockedFields.has("time_in");
  const hasLunchOut = clockedFields.has("lunch_out");
  const hasLunchIn  = clockedFields.has("lunch_in");
  const hasTimeOut  = clockedFields.has("time_out");

  // ── CASE 1: Standard 4-punch schedule (time_in, lunch_out, lunch_in, time_out) ──
  if (timeIn !== null && lunchOut !== null && lunchIn !== null && timeOut !== null) {
    const mid1 = Math.floor((timeIn + lunchOut) / 2);
    const mid2 = Math.floor((lunchOut + lunchIn) / 2);
    const mid3 = Math.floor((lunchIn + timeOut) / 2);

    // Segment 1: Morning Check-In (Before mid1)
    if (nowMinutes < mid1) {
      if (!hasTimeIn) return "time_in";
      return "lunch_out";
    }

    // Segment 2: Lunch Out (mid1 to mid2)
    if (nowMinutes >= mid1 && nowMinutes < mid2) {
      if (!hasLunchOut) return "lunch_out";
      if (!hasLunchIn) return "lunch_in";
      return "lunch_out";
    }

    // Segment 3: Lunch In (mid2 to mid3)
    if (nowMinutes >= mid2 && nowMinutes < mid3) {
      if (!hasLunchIn) {
        return "lunch_in";
      }
      return "time_out";
    }

    // Segment 4: Evening Check-Out (mid3 to end of day)
    return "time_out";
  }

  // ── CASE 2: 2-punch schedule (time_in and time_out only) ──
  if (timeIn !== null && timeOut !== null) {
    const mid = Math.floor((timeIn + timeOut) / 2);
    if (nowMinutes < mid) {
      if (!hasTimeIn) return "time_in";
      return "time_out";
    }
    return "time_out";
  }

  // ── CASE 3: Morning Shift (time_in and lunch_out only, or lunch_out acts as time_out) ──
  if (timeIn !== null && lunchOut !== null) {
    const mid = Math.floor((timeIn + lunchOut) / 2);
    if (nowMinutes < mid) {
      if (!hasTimeIn) return "time_in";
      return "lunch_out";
    }
    return "lunch_out";
  }

  // ── CASE 4: Afternoon Shift (lunch_in and time_out only) ──
  if (lunchIn !== null && timeOut !== null) {
    const mid = Math.floor((lunchIn + timeOut) / 2);
    if (nowMinutes < mid) {
      if (!hasLunchIn) return "lunch_in";
      return "time_out";
    }
    return "time_out";
  }

  // ── CASE 5: Single punch definitions ──
  if (timeIn !== null && !hasTimeIn) return "time_in";
  if (timeOut !== null) return "time_out";
  if (lunchOut !== null && !hasLunchOut) return "lunch_out";
  if (lunchIn !== null && !hasLunchIn) return "lunch_in";

  return null;
};

// Also test fallback when timesheet is null (no schedule assigned)
export const resolveTimeFieldFallback = (modes, clockedFields = new Set()) => {
  // Ordered sequence of mode types
  const order = ["time_in", "lunch_out", "lunch_in", "time_out"];
  for (const field of order) {
    if (!clockedFields.has(field)) {
      return field;
    }
  }
  return "time_out";
};

function runAllTests() {
  console.log("=== TEST 1: Full-Time (08:00 - 12:00 - 13:00 - 19:00) ===");
  const ft = { time_in: "08:00", lunch_out: "12:00", lunch_in: "13:00", time_out: "19:00" };
  assert.strictEqual(inferTimeFieldFromSchedule(ft, 7 * 60, new Set()), "time_in"); // 7:00 AM
  assert.strictEqual(inferTimeFieldFromSchedule(ft, 8 * 60 + 22, new Set()), "time_in"); // 8:22 AM
  assert.strictEqual(inferTimeFieldFromSchedule(ft, 11 * 60, new Set(["time_in"])), "lunch_out"); // 11:00 AM
  assert.strictEqual(inferTimeFieldFromSchedule(ft, 12 * 60 + 15, new Set(["time_in"])), "lunch_out"); // 12:15 PM
  assert.strictEqual(inferTimeFieldFromSchedule(ft, 12 * 60 + 45, new Set(["time_in", "lunch_out"])), "lunch_in"); // 12:45 PM
  assert.strictEqual(inferTimeFieldFromSchedule(ft, 15 * 60 + 4, new Set(["time_in"])), "lunch_in"); // 3:04 PM
  assert.strictEqual(inferTimeFieldFromSchedule(ft, 15 * 60 + 18, new Set(["time_in", "lunch_in"])), "time_out"); // 3:18 PM
  assert.strictEqual(inferTimeFieldFromSchedule(ft, 18 * 60 + 50, new Set(["time_in", "lunch_out", "lunch_in"])), "time_out"); // 6:50 PM
  assert.strictEqual(inferTimeFieldFromSchedule(ft, 21 * 60, new Set(["time_in", "lunch_out", "lunch_in", "time_out"])), "time_out"); // 9:00 PM

  console.log("=== TEST 2: Morning Shift (08:00 - 14:00) ===");
  const ms = { time_in: "08:00", lunch_out: "14:00", lunch_in: null, time_out: null };
  assert.strictEqual(inferTimeFieldFromSchedule(ms, 8 * 60, new Set()), "time_in");
  assert.strictEqual(inferTimeFieldFromSchedule(ms, 12 * 60, new Set(["time_in"])), "lunch_out");
  assert.strictEqual(inferTimeFieldFromSchedule(ms, 14 * 60 + 10, new Set(["time_in"])), "lunch_out");

  console.log("=== TEST 3: Afternoon Shift (14:00 - 19:00) ===");
  const as = { time_in: null, lunch_out: null, lunch_in: "14:00", time_out: "19:00" };
  assert.strictEqual(inferTimeFieldFromSchedule(as, 13 * 60 + 50, new Set()), "lunch_in");
  assert.strictEqual(inferTimeFieldFromSchedule(as, 17 * 60, new Set(["lunch_in"])), "time_out");
  assert.strictEqual(inferTimeFieldFromSchedule(as, 19 * 60 + 10, new Set(["lunch_in"])), "time_out");

  console.log("=== TEST 4: 2-Punch Shift (08:00 - 17:00) ===");
  const twoP = { time_in: "08:00", lunch_out: null, lunch_in: null, time_out: "17:00" };
  assert.strictEqual(inferTimeFieldFromSchedule(twoP, 8 * 60, new Set()), "time_in");
  assert.strictEqual(inferTimeFieldFromSchedule(twoP, 12 * 60, new Set(["time_in"])), "time_out");
  assert.strictEqual(inferTimeFieldFromSchedule(twoP, 15 * 60, new Set(["time_in"])), "time_out");
  assert.strictEqual(inferTimeFieldFromSchedule(twoP, 17 * 60 + 10, new Set(["time_in"])), "time_out");

  console.log("=== TEST 5: Fallback when no schedule configured ===");
  assert.strictEqual(resolveTimeFieldFallback([], new Set()), "time_in");
  assert.strictEqual(resolveTimeFieldFallback([], new Set(["time_in"])), "lunch_out");
  assert.strictEqual(resolveTimeFieldFallback([], new Set(["time_in", "lunch_out"])), "lunch_in");
  assert.strictEqual(resolveTimeFieldFallback([], new Set(["time_in", "lunch_out", "lunch_in"])), "time_out");

  console.log("=== ALL 5 SCENARIOS PASSED WITH ZERO ERRORS! ===");
}

runAllTests();
