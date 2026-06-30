import assert from "assert";

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return null;
  const [hh, mm] = timeStr.split(":");
  const h = Number(hh);
  const m = Number(mm);
  return h * 60 + m;
};

const ATTENDANCE_GRACE_MINUTES = 10;

const inferTimeFieldFromScheduleNew = (timeSheet, nowMinutes, clockedFields = new Set()) => {
  if (!timeSheet) return null;

  const timeIn   = parseTimeToMinutes(timeSheet.time_in);
  const lunchOut = parseTimeToMinutes(timeSheet.lunch_out);
  const lunchIn  = parseTimeToMinutes(timeSheet.lunch_in);
  const timeOut  = parseTimeToMinutes(timeSheet.time_out);

  const WINDOW = 120;

  // ── time_in window ──────────────────────────────────────────────
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
  if (lunchOut !== null && lunchIn !== null) {
    const midpoint = Math.floor((lunchOut + lunchIn) / 2);

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
    if (nowMinutes >= lunchOut - WINDOW && nowMinutes <= midpoint) {
      return "lunch_out";
    }
    if (nowMinutes > midpoint && nowMinutes <= lunchIn + WINDOW) {
      return "lunch_in";
    }
  } else if (lunchOut !== null) {
    if (nowMinutes >= lunchOut - WINDOW && nowMinutes <= lunchOut + WINDOW) {
      return "lunch_out";
    }
  } else if (lunchIn !== null) {
    if (nowMinutes >= lunchIn - WINDOW && nowMinutes <= lunchIn + WINDOW) {
      return "lunch_in";
    }
  }

  // ── time_out window ──────────────────────────────────────────────
  if (
    timeOut !== null &&
    nowMinutes >= timeOut - WINDOW
  ) {
    return "time_out";
  }

  return null;
};

const timeSheet = {
  time_in: "08:00",
  lunch_out: "12:00",
  lunch_in: "13:00",
  time_out: "17:00",
};

const runTests = () => {
  // Test case 1: 12:00 (first scan, expecting lunch_out)
  const result1 = inferTimeFieldFromScheduleNew(timeSheet, 12 * 60, new Set(["time_in"]));
  console.log("Test 1 (12:00, clocked time_in):", result1, "-> Expected: lunch_out");
  assert.strictEqual(result1, "lunch_out");

  // Test case 2: 12:23 (second scan, expecting lunch_in because lunch_out is already clocked)
  const result2 = inferTimeFieldFromScheduleNew(timeSheet, 12 * 60 + 23, new Set(["time_in", "lunch_out"]));
  console.log("Test 2 (12:23, clocked time_in, lunch_out):", result2, "-> Expected: lunch_in");
  assert.strictEqual(result2, "lunch_in");

  // Test case 3: 13:05 (scanned lunch_in after midpoint, lunch_out clocked)
  const result3 = inferTimeFieldFromScheduleNew(timeSheet, 13 * 60 + 5, new Set(["time_in", "lunch_out"]));
  console.log("Test 3 (13:05, clocked time_in, lunch_out):", result3, "-> Expected: lunch_in");
  assert.strictEqual(result3, "lunch_in");

  // Test case 4: 13:05 (scanned lunch_out late, lunch_out NOT clocked)
  const result4 = inferTimeFieldFromScheduleNew(timeSheet, 13 * 60 + 5, new Set(["time_in"]));
  console.log("Test 4 (13:05, clocked time_in only):", result4, "-> Expected: lunch_out");
  assert.strictEqual(result4, "lunch_out");

  // Test case 5: 17:00 (scanned time_out, lunch_out and lunch_in clocked)
  const result5 = inferTimeFieldFromScheduleNew(timeSheet, 17 * 60, new Set(["time_in", "lunch_out", "lunch_in"]));
  console.log("Test 5 (17:00, all prior clocked):", result5, "-> Expected: time_out");
  assert.strictEqual(result5, "time_out");

  console.log("All test cases passed successfully!");
};

runTests();
