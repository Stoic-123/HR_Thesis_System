import prisma from "../lib/prisma.js";
import { createNotification, notifyAdmins, notifyManager } from "./Notification.js";
import { getIO } from "../utils/socket.js";
import { formatICTDate, toICTDate } from "../utils/timezone.js";

export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

export const getTodayKey = (dateObj) => {
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

/**
 * Get employee working schedule/timesheet for a specific date
 */
export const getEmployeeScheduleForDate = async (employee_id, company_id, dateObj = new Date()) => {
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
    where: { employee_id: parseInt(employee_id) },
    ...includeDayOfWeek,
  });

  const dayOfWeekConfig =
    profile?.dayofweek ||
    (await prisma.dayofweek.findFirst({
      where: { company_id: parseInt(company_id), is_default: true },
      include: includeDayOfWeek.include.dayofweek.include,
    }));

  if (!dayOfWeekConfig) {
    return { dayOfWeekConfig: null, timeSheet: null };
  }

  const dayKey = getTodayKey(dateObj);
  const timeSheet = dayOfWeekConfig[dayKey] || null;

  return { dayOfWeekConfig, timeSheet };
};

/**
 * Validate timing and infer target shift (time_in / lunch_in / lunch_out / time_out)
 * for #late and #early requests.
 */
export const validateAndInferLateEarlyRequest = async ({
  employee_id,
  company_id,
  commandType = "LATE", // "LATE" or "EARLY"
  requestDate = new Date(),
}) => {
  const { timeSheet } = await getEmployeeScheduleForDate(employee_id, company_id, requestDate);

  if (!timeSheet) {
    return {
      valid: false,
      reasonCode: "NO_SCHEDULE",
      message: "មិនមានកាលវិភាគការងារសម្រាប់ថ្ងៃនេះទេ / No working schedule configured for today.",
    };
  }

  const ictDate = toICTDate(requestDate);
  const nowMinutes = ictDate.getUTCHours() * 60 + ictDate.getUTCMinutes();

  const timeInStr = timeSheet.time_in;
  const lunchOutStr = timeSheet.lunch_out;
  const lunchInStr = timeSheet.lunch_in;
  const timeOutStr = timeSheet.time_out;

  const timeInMin = parseTimeToMinutes(timeInStr);
  const lunchOutMin = parseTimeToMinutes(lunchOutStr);
  const lunchInMin = parseTimeToMinutes(lunchInStr);
  const timeOutMin = parseTimeToMinutes(timeOutStr);

  const type = commandType.toUpperCase();

  if (type === "LATE") {
    // #late applies to: time_in (morning) OR lunch_in (lunch return)
    const hasLunchIn = lunchInMin !== null;
    const morningThreshold =
      timeInMin !== null && lunchInMin !== null
        ? Math.floor((timeInMin + lunchInMin) / 2)
        : (lunchOutMin !== null ? lunchOutMin : (timeInMin !== null ? timeInMin + 180 : 660));

    // 1. Morning Shift (Time In)
    if (!hasLunchIn || nowMinutes < morningThreshold) {
      if (timeInMin === null) {
        return {
          valid: false,
          reasonCode: "NO_TIME_IN",
          message: "កាលវិភាគមិនមានកំណត់ម៉ោងចូល (Time In) ទេ / Schedule has no Time In set.",
        };
      }

      if (nowMinutes > timeInMin) {
        return {
          valid: false,
          reasonCode: "PAST_DEADLINE",
          scheduled_time: timeInStr,
          time_field: "time_in",
          field_label: "Time In",
          message: `អ្នកអាចស្នើសុំយឺតបានតែ <b>មុនម៉ោង ${timeInStr} (Time In)</b> ប៉ុណ្ណោះ។\n<i>You can only request late before your scheduled Time In (${timeInStr}).</i>`,
        };
      }

      return {
        valid: true,
        request_type: "LATE",
        time_field: "time_in",
        scheduled_time: timeInStr,
        field_label: "Time In",
      };
    }

    // 2. Lunch Return Shift (Lunch In)
    if (lunchInMin === null) {
      return {
        valid: false,
        reasonCode: "NO_LUNCH_IN",
        message: "កាលវិភាគមិនមានកំណត់ម៉ោងចូលបន្ទាប់ពីបាយ (Lunch In) ទេ / Schedule has no Lunch In set.",
      };
    }

    if (nowMinutes > lunchInMin) {
      return {
        valid: false,
        reasonCode: "PAST_DEADLINE",
        scheduled_time: lunchInStr,
        time_field: "lunch_in",
        field_label: "Lunch In",
        message: `អ្នកអាចស្នើសុំយឺតបានតែ <b>មុនម៉ោង ${lunchInStr} (Lunch In)</b> ប៉ុណ្ណោះ។\n<i>You can only request late before your scheduled Lunch In (${lunchInStr}).</i>`,
      };
    }

    return {
      valid: true,
      request_type: "LATE",
      time_field: "lunch_in",
      scheduled_time: lunchInStr,
      field_label: "Lunch In",
    };
  }

  // type === "EARLY"
  // #early applies to: lunch_out (leaving early for lunch) OR time_out (leaving early for the day)
  const hasLunchOut = lunchOutMin !== null;
  const afternoonThreshold =
    lunchInMin !== null
      ? lunchInMin + 30
      : (lunchOutMin !== null && timeOutMin !== null ? Math.floor((lunchOutMin + timeOutMin) / 2) : 780);

  // 1. Lunch Break Departure (Lunch Out)
  if (hasLunchOut && nowMinutes < afternoonThreshold) {
    if (nowMinutes > lunchOutMin) {
      return {
        valid: false,
        reasonCode: "PAST_DEADLINE",
        scheduled_time: lunchOutStr,
        time_field: "lunch_out",
        field_label: "Lunch Out",
        message: `អ្នកអាចស្នើសុំចេញមុនបានតែ <b>មុនម៉ោង ${lunchOutStr} (Lunch Out)</b> ប៉ុណ្ណោះ។\n<i>You can only request early before your scheduled Lunch Out (${lunchOutStr}).</i>`,
      };
    }

    return {
      valid: true,
      request_type: "EARLY",
      time_field: "lunch_out",
      scheduled_time: lunchOutStr,
      field_label: "Lunch Out",
    };
  }

  // 2. End of Day Departure (Time Out)
  if (timeOutMin === null) {
    return {
      valid: false,
      reasonCode: "NO_TIME_OUT",
      message: "កាលវិភាគមិនមានកំណត់ម៉ោងចេញ (Time Out) ទេ / Schedule has no Time Out set.",
    };
  }

  if (nowMinutes > timeOutMin) {
    return {
      valid: false,
      reasonCode: "PAST_DEADLINE",
      scheduled_time: timeOutStr,
      time_field: "time_out",
      field_label: "Time Out",
      message: `អ្នកអាចស្នើសុំចេញមុនបានតែ <b>មុនម៉ោង ${timeOutStr} (Time Out)</b> ប៉ុណ្ណោះ។\n<i>You can only request early before your scheduled Time Out (${timeOutStr}).</i>`,
    };
  }

  return {
    valid: true,
    request_type: "EARLY",
    time_field: "time_out",
    scheduled_time: timeOutStr,
    field_label: "Time Out",
  };
};

/**
 * Create a new late / early request
 */
export const createLateRequest = async ({
  employee_id,
  company_id,
  request_type = "LATE",
  time_field = null,
  scheduled_time = null,
  reason,
  request_date = new Date(),
  telegram_message_id = null,
  telegram_chat_id = null,
  manager_telegram_username = null,
}) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employee_id) },
      include: {
        department_employee_department_idTodepartment: {
          include: {
            employee_department_manager_idToemployee: true,
          },
        },
      },
    });

    if (!employee) {
      return { result: false, message: "Employee not found." };
    }

    const effectiveCompanyId = company_id || employee.company_id;

    const newLate = await prisma.laterequest.create({
      data: {
        company_id: parseInt(effectiveCompanyId),
        employee_id: parseInt(employee_id),
        request_type: request_type ? request_type.toUpperCase() : "LATE",
        time_field: time_field || null,
        scheduled_time: scheduled_time || null,
        request_date: request_date ? new Date(request_date) : new Date(),
        reason: reason || "មិនបានបញ្ជាក់មូលហេតុ / Not specified",
        status: "pending",
        telegram_message_id: telegram_message_id ? parseInt(telegram_message_id) : null,
        telegram_chat_id: telegram_chat_id ? String(telegram_chat_id) : null,
        manager_telegram_username: manager_telegram_username || null,
      },
      include: {
        employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            profile_path: true,
            department_employee_department_idTodepartment: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // In-app notifications
    try {
      const fullName = `${employee.first_name} ${employee.last_name}`.trim();
      const typeName = request_type === "EARLY" ? "Early Leave" : "Late";
      const notifTitle = `New ${typeName} Request`;
      const notifBody = `${fullName} has submitted an ${typeName} request: ${reason || typeName}`;
      await notifyManager(employee.id, notifTitle, notifBody, newLate.id);
      await notifyAdmins(effectiveCompanyId, notifTitle, notifBody, newLate.id);
    } catch (nErr) {
      console.error("[LateRequest Service] Notification error:", nErr.message);
    }

    // Real-time socket broadcast
    try {
      const io = getIO();
      if (io) {
        io.emit("laterequest:created", {
          id: newLate.id,
          employeeId: employee.id,
          companyId: effectiveCompanyId,
          requestType: newLate.request_type,
        });
      }
    } catch (_) {}

    return {
      result: true,
      message: `${request_type === "EARLY" ? "Early leave" : "Late"} request submitted successfully.`,
      data: newLate,
    };
  } catch (error) {
    console.error("[LateRequest Service] createLateRequest error:", error.message);
    throw error;
  }
};

/**
 * Approve a late request
 */
export const approveLateRequest = async (id, approver_id) => {
  try {
    const lateRequest = await prisma.laterequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        employee: true,
      },
    });

    if (!lateRequest) {
      return { result: false, message: "Late request not found." };
    }

    if (lateRequest.status !== "pending") {
      return {
        result: false,
        message: `Late request already ${lateRequest.status}.`,
      };
    }

    const updated = await prisma.laterequest.update({
      where: { id: parseInt(id) },
      data: {
        status: "approved",
        approved_by: approver_id ? parseInt(approver_id) : null,
      },
      include: {
        employee: true,
        approver: true,
      },
    });

    // In-app notification to employee
    try {
      const empUser = await prisma.user.findFirst({
        where: { employee_id: lateRequest.employee_id },
      });
      if (empUser) {
        const approverName = updated.approver
          ? `${updated.approver.first_name} ${updated.approver.last_name}`.trim()
          : "Manager";
        await createNotification(
          lateRequest.company_id,
          "Late Request Approved",
          `Your late request for ${formatICTDate(lateRequest.request_date)} has been approved by ${approverName}.`,
          empUser.id,
          lateRequest.id
        );
      }
    } catch (nErr) {
      console.error("[LateRequest Service] Approve notification error:", nErr.message);
    }

    // Real-time socket broadcast
    try {
      const io = getIO();
      if (io) {
        io.emit("laterequest:updated", {
          action: "approved",
          id: lateRequest.id,
          employeeId: lateRequest.employee_id,
          companyId: lateRequest.company_id,
        });
      }
    } catch (_) {}

    return {
      result: true,
      message: "Late request approved successfully.",
      data: updated,
    };
  } catch (error) {
    console.error("[LateRequest Service] approveLateRequest error:", error.message);
    throw error;
  }
};

/**
 * Reject a late request
 */
export const rejectLateRequest = async (id, approver_id) => {
  try {
    const lateRequest = await prisma.laterequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        employee: true,
      },
    });

    if (!lateRequest) {
      return { result: false, message: "Late request not found." };
    }

    if (lateRequest.status !== "pending") {
      return {
        result: false,
        message: `Late request already ${lateRequest.status}.`,
      };
    }

    const updated = await prisma.laterequest.update({
      where: { id: parseInt(id) },
      data: {
        status: "rejected",
        approved_by: approver_id ? parseInt(approver_id) : null,
      },
      include: {
        employee: true,
        approver: true,
      },
    });

    // In-app notification to employee
    try {
      const empUser = await prisma.user.findFirst({
        where: { employee_id: lateRequest.employee_id },
      });
      if (empUser) {
        const approverName = updated.approver
          ? `${updated.approver.first_name} ${updated.approver.last_name}`.trim()
          : "Manager";
        await createNotification(
          lateRequest.company_id,
          "Late Request Rejected",
          `Your late request for ${formatICTDate(lateRequest.request_date)} has been rejected by ${approverName}.`,
          empUser.id,
          lateRequest.id
        );
      }
    } catch (nErr) {
      console.error("[LateRequest Service] Reject notification error:", nErr.message);
    }

    // Real-time socket broadcast
    try {
      const io = getIO();
      if (io) {
        io.emit("laterequest:updated", {
          action: "rejected",
          id: lateRequest.id,
          employeeId: lateRequest.employee_id,
          companyId: lateRequest.company_id,
        });
      }
    } catch (_) {}

    return {
      result: true,
      message: "Late request rejected.",
      data: updated,
    };
  } catch (error) {
    console.error("[LateRequest Service] rejectLateRequest error:", error.message);
    throw error;
  }
};

/**
 * Cancel a pending late / early request
 */
export const cancelLateRequest = async (id, employee_id) => {
  try {
    const lateRequest = await prisma.laterequest.findUnique({
      where: { id: parseInt(id) },
      include: { employee: true },
    });

    if (!lateRequest) {
      return { result: false, message: "Request not found." };
    }

    if (employee_id && lateRequest.employee_id !== parseInt(employee_id)) {
      return { result: false, message: "Unauthorized to cancel this request." };
    }

    if (lateRequest.status !== "pending") {
      return {
        result: false,
        message: `Request cannot be cancelled because it is already ${lateRequest.status}.`,
      };
    }

    const updated = await prisma.laterequest.update({
      where: { id: parseInt(id) },
      data: { status: "cancelled" },
      include: { employee: true },
    });

    // Real-time socket broadcast
    try {
      const io = getIO();
      if (io) {
        io.emit("laterequest:updated", {
          action: "cancelled",
          id: lateRequest.id,
          employeeId: lateRequest.employee_id,
          companyId: lateRequest.company_id,
        });
      }
    } catch (_) {}

    return {
      result: true,
      message: "Request cancelled successfully.",
      data: updated,
    };
  } catch (error) {
    console.error("[LateRequest Service] cancelLateRequest error:", error.message);
    throw error;
  }
};

/**
 * Get all late requests with optional filters
 */
export const getAllLateRequests = async (company_id, filters = {}) => {
  try {
    const { start_date, end_date, department_id, employee_id, status } = filters;
    const where = { company_id: parseInt(company_id) };

    if (status) where.status = status;
    if (employee_id) where.employee_id = parseInt(employee_id);
    if (department_id) {
      where.employee = { department_id: parseInt(department_id) };
    }

    if (start_date && end_date) {
      where.request_date = {
        gte: new Date(start_date),
        lte: new Date(end_date),
      };
    } else if (start_date) {
      where.request_date = { gte: new Date(start_date) };
    } else if (end_date) {
      where.request_date = { lte: new Date(end_date) };
    }

    const lateRequests = await prisma.laterequest.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            profile_path: true,
            department_employee_department_idTodepartment: {
              select: { id: true, name: true },
            },
            role: { select: { id: true, name: true } },
          },
        },
        approver: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    return {
      result: true,
      message: "Get late requests successfully.",
      data: lateRequests,
    };
  } catch (error) {
    console.error("[LateRequest Service] getAllLateRequests error:", error.message);
    throw error;
  }
};

/**
 * Get late requests for current logged-in employee
 */
export const getMyLateRequests = async (employee_id) => {
  try {
    const lateRequests = await prisma.laterequest.findMany({
      where: { employee_id: parseInt(employee_id) },
      orderBy: { created_at: "desc" },
      include: {
        approver: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    return {
      result: true,
      message: "Get my late requests successfully.",
      data: lateRequests,
    };
  } catch (error) {
    console.error("[LateRequest Service] getMyLateRequests error:", error.message);
    throw error;
  }
};

/**
 * Get pending late requests for a department manager
 */
export const getPendingLateRequestsForManager = async (manager_employee_id, company_id) => {
  try {
    const departments = await prisma.department.findMany({
      where: {
        manager_id: parseInt(manager_employee_id),
        company_id: parseInt(company_id),
      },
      select: { id: true },
    });

    const deptIds = departments.map((d) => d.id);

    const pendingRequests = await prisma.laterequest.findMany({
      where: {
        company_id: parseInt(company_id),
        status: "pending",
        employee: {
          department_id: { in: deptIds },
          id: { not: parseInt(manager_employee_id) }, // Cannot approve own request
        },
      },
      orderBy: { created_at: "desc" },
      include: {
        employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            profile_path: true,
            department_employee_department_idTodepartment: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return {
      result: true,
      message: "Get pending late requests for manager successfully.",
      data: pendingRequests,
    };
  } catch (error) {
    console.error("[LateRequest Service] getPendingLateRequestsForManager error:", error.message);
    throw error;
  }
};
