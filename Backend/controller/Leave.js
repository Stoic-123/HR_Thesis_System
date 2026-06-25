import prisma from "../lib/prisma.js";
import { CreateNewLeave, GetAllLeaves, ApproveLeave, RejectLeave, GetPendingLeavesForManager, CancelLeave } from "../service/Leave.js";
import { getLeaveTypeCode } from "../service/LeaveProfile.js";
import { addAuditLog } from "../service/AuditLog.js";
import { toICTDate } from "../utils/timezone.js";

export const createNewLeaveController = async (req, res) => {
  try {
    const userId = req.user.id;
    const employeeId = req.user.employee_id;
    const companyId = req.user.company_id;

    if (!employeeId) {
      return res
        .status(400)
        .json({ result: false, message: "User is not associated with an employee profile." });
    }

    let photo_path = "";
    if (req.files && req.files.photo_path) {
      const photo = req.files.photo_path;
      const photoName = Date.now() + "_" + photo.name;
      const photoPath = "public/uploads/leaves/" + photoName;
      await photo.mv(photoPath);
      photo_path = "/uploads/leaves/" + photoName;
    }

    const { leave_type_id, dates, reason } = req.body;
    let parsedDates = [];
    try {
      parsedDates = typeof dates === 'string' ? JSON.parse(dates) : dates;
    } catch (e) {
      return res.status(400).json({ result: false, message: "Invalid dates format!" });
    }

    if (!leave_type_id || !parsedDates || parsedDates.length === 0 || !reason || reason.trim().length === 0) {
      return res
        .status(400)
        .json({ result: false, message: "All fields are required and reason cannot be empty!" });
    }

    const leave_type_code = await getLeaveTypeCode(leave_type_id);
    // Check if leave type is ML and employee is female
    if (leave_type_code === "ML") {
      const employee = await prisma.employee.findUnique({
        where: { id: parseInt(employeeId) },
        select: { gender: true },
      });
      if (employee?.gender !== "female") {
        return res.status(400).json({
          result: false,
          message: "Maternity Leave is only available for female employees.",
        });
      }
    }

    if (leave_type_code === "SL" || leave_type_code === "ML") {
      if (!photo_path) {
        return res.status(400).json({
          result: false,
          message: "Photo reference is required for Sick Leave Or ML..!",
        });
      }
    }

    const leaveResult = await CreateNewLeave(
      employeeId,
      leave_type_id,
      parsedDates,
      reason,
      photo_path || null,
    );

    // Audit Log
    await addAuditLog(
      userId,
      companyId,
      "Leave",
      "CREATE",
      `Requested leave for dates: ${parsedDates.join(', ')}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json(leaveResult);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getMyLeavesController = async (req, res) => {
  try {
    const employeeId = req.user.employee_id;
    if (!employeeId) {
      return res
        .status(400)
        .json({ result: false, message: "Employee context is required." });
    }

    const leaves = await prisma.leaverecord.findMany({
      where: {
        employee_id: parseInt(employeeId),
      },
      include: {
        leavetype: true,
      },
      orderBy: {
        request_at: "desc",
      },
    });

    // Format fields to match frontend's expected properties
    const formattedLeaves = leaves.map((leave) => {
      const start = leave.start_date;
      const end = leave.end_date;
      const diffTime = Math.abs(new Date(end) - new Date(start));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      const formatDisplayDate = (d) => {
        const pad = (n) => String(n).padStart(2, "0");
        const date = toICTDate(d);
        return `${pad(date.getUTCDate())}-${pad(date.getUTCMonth() + 1)}-${date.getUTCFullYear()}`;
      };

      const formatISODate = (d) => {
        const pad = (n) => String(n).padStart(2, "0");
        const date = toICTDate(d);
        return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
      };

      return {
        id: leave.id,
        employee_name: req.user.username || "Employee",
        status: leave.status || "pending",
        startDate: formatDisplayDate(start),
        endDate: formatDisplayDate(end),
        start_date: formatISODate(start),
        end_date: formatISODate(end),
        duration: `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`,
        leaveType: leave.leavetype?.name || "Leave",
        reason: leave.reason || "",
        photo_path: leave.photo_path || null,
      };
    });

    res.status(200).json({ result: true, data: formattedLeaves });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getLeaveSummaryController = async (req, res) => {
  try {
    const employeeId = req.user.employee_id;
    const companyId = req.user.company_id;

    if (!employeeId || !companyId) {
      return res
        .status(400)
        .json({ result: false, message: "Employee and company contexts are required." });
    }

    // Fetch employee to check gender
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employeeId) },
      select: { gender: true },
    });

    // 1. Fetch leave types
    const leaveTypes = await prisma.leavetype.findMany({
      where: {
        company_id: parseInt(companyId),
      },
    });

    // Filter out ML leave type if employee is not female
    const filteredLeaveTypes = leaveTypes.filter(lt => {
      if (lt.code === 'ML' && employee?.gender !== 'female') {
        return false;
      }
      return true;
    });

    // 2. Fetch employee's leave profiles
    const leaveProfiles = await prisma.leaveprofile.findMany({
      where: {
        employee_id: parseInt(employeeId),
      },
      include: {
        leavetype: true,
      },
    });

    // Filter out ML leave profile if employee is not female
    const filteredLeaveProfiles = leaveProfiles.filter(lp => {
      if (lp.leavetype?.code === 'ML' && employee?.gender !== 'female') {
        return false;
      }
      return true;
    });

    // 3. Fetch employee's approved leave records to compute actual days taken
    const approvedLeaves = await prisma.leaverecord.findMany({
      where: {
        employee_id: parseInt(employeeId),
        status: "approved",
      },
    });

    // Calculate dynamic stats
    let totalLeave = 0;
    let leaveUsed = 0;
    const details = [];

    if (filteredLeaveProfiles.length > 0) {
      filteredLeaveProfiles.forEach((lp) => {
        totalLeave += lp.assignment || 0;
        leaveUsed += lp.used || 0;
        details.push({
          id: lp.id,
          leaveType: lp.leavetype?.name || "Leave",
          code: lp.leavetype?.code || "",
          assignment: lp.assignment || 0,
          used: lp.used || 0,
          balance: lp.balance || 0,
        });
      });
    } else {
      // Fallback: use default leave types
      filteredLeaveTypes.forEach((lt) => {
        // Calculate approved leave records of this type
        const typeLeaves = approvedLeaves.filter((l) => l.leave_type_id === lt.id);
        let usedDays = 0;
        typeLeaves.forEach((leave) => {
          const start = new Date(leave.start_date);
          const end = new Date(leave.end_date);
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          usedDays += diffDays;
        });

        const defaultBal = lt.default_balance || 0;
        totalLeave += defaultBal;
        leaveUsed += usedDays;

        details.push({
          id: lt.id,
          leaveType: lt.name,
          code: lt.code,
          assignment: defaultBal,
          used: usedDays,
          balance: defaultBal - usedDays,
        });
      });
    }

    res.status(200).json({
      result: true,
      totalLeave,
      leaveUsed,
      leaveBalance: totalLeave - leaveUsed,
      details,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getAllLeavesController = async (req, res) => {
  try {
    console.log("getAllLeavesController called, user:", req.user);
    const companyId = req.user.company_id;
    const employeeId = req.user.employee_id;
    console.log("Company ID:", companyId);
    
    // Get filters from query params
    const { status, department_id, search } = req.query;

    // Fetch user role and department to check access permissions
    const currentEmployee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { role: true },
    });

    const isHrOrAdmin =
      currentEmployee?.role?.name?.toLowerCase().includes("admin") ||
      currentEmployee?.role?.name?.toLowerCase().includes("hr");
    
    const filters = {};
    if (status) filters.status = status;
    
    // If not HR or Admin, force filter by their own department_id
    if (!isHrOrAdmin && currentEmployee?.department_id) {
      filters.department_id = currentEmployee.department_id;
    } else if (department_id && department_id !== "all") {
      filters.department_id = department_id;
    }

    if (search) filters.search = search;
    
    const leaves = await GetAllLeaves(companyId, filters);
    console.log("Leaves found:", leaves.length);

    // Build department filter list
    const deptWhere = { company_id: parseInt(companyId) };
    if (!isHrOrAdmin && currentEmployee?.department_id) {
      deptWhere.id = currentEmployee.department_id;
    }

    // Also fetch all departments for frontend to use as filter options
    const departments = await prisma.department.findMany({
      where: deptWhere,
      orderBy: { name: "asc" },
    });

    // Format the response
    const formattedLeaves = leaves.map((leave) => {
      const start = leave.start_date;
      const end = leave.end_date;
      const formatDate = (d) => {
        const pad = (n) => String(n).padStart(2, '0');
        const date = toICTDate(d);
        return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
      };

      return {
        id: leave.id,
        employee: `${leave.employee_leaverecord_employee_idToemployee.first_name} ${leave.employee_leaverecord_employee_idToemployee.last_name}`,
        type: leave.leavetype.name,
        from: formatDate(start),
        to: formatDate(end),
        status: leave.status,
        department: leave.employee_leaverecord_employee_idToemployee.department_employee_department_idTodepartment?.name || null,
        department_id: leave.employee_leaverecord_employee_idToemployee.department_id || null,
      };
    });

    res.status(200).json({ result: true, data: formattedLeaves, departments });
  } catch (error) {
    console.error("Error in getAllLeavesController:", error);
    res.status(500).json({ result: false, message: error?.message || "Internal Server Error" });
  }
};

export const getPendingLeavesForManagerController = async (req, res) => {
  try {
    const managerEmployeeId = req.user.employee_id;
    const companyId = req.user.company_id;

    if (!managerEmployeeId) {
      return res.status(400).json({ result: false, message: "Manager employee ID is required." });
    }

    const pendingLeaves = await GetPendingLeavesForManager(managerEmployeeId, companyId);
    console.log("pendingLeaves for manager", managerEmployeeId, "is", JSON.stringify(pendingLeaves));

    // Format the response
    const formattedLeaves = pendingLeaves.map((leave) => {
      const start = leave.start_date;
      const end = leave.end_date;
      const formatDate = (d) => {
        const pad = (n) => String(n).padStart(2, '0');
        const date = toICTDate(d);
        return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
      };

      return {
        id: leave.id,
        employee: `${leave.employee_leaverecord_employee_idToemployee.first_name} ${leave.employee_leaverecord_employee_idToemployee.last_name}`,
        department: leave.employee_leaverecord_employee_idToemployee.department_employee_department_idTodepartment?.name || null,
        type: leave.leavetype.name,
        from: formatDate(start),
        to: formatDate(end),
        status: leave.status,
        reason: leave.reason,
        photo_path: leave.photo_path,
        request_at: leave.request_at,
      };
    });

    res.status(200).json({ result: true, data: formattedLeaves });
  } catch (error) {
    console.error("Error in getPendingLeavesForManagerController:", error);
    res.status(500).json({ result: false, message: error.message || "Internal Server Error" });
  }
};

export const approveLeaveController = async (req, res) => {
  try {
    const { id } = req.params;
    const approved_by = req.user.employee_id;
    const userId = req.user.id;
    const companyId = req.user.company_id;

    if (!approved_by) {
      return res.status(400).json({ result: false, message: "User is not associated with an employee profile." });
    }

    const result = await ApproveLeave(id, approved_by);

    // Audit Log
    await addAuditLog(
      userId,
      companyId,
      "Leave",
      "APPROVE",
      `Approved leave request #${id}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json(result);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const rejectLeaveController = async (req, res) => {
  try {
    const { id } = req.params;
    const approved_by = req.user.employee_id;
    const userId = req.user.id;
    const companyId = req.user.company_id;

    if (!approved_by) {
      return res.status(400).json({ result: false, message: "User is not associated with an employee profile." });
    }

    const result = await RejectLeave(id, approved_by);

    // Audit Log
    await addAuditLog(
      userId,
      companyId,
      "Leave",
      "REJECT",
      `Rejected leave request #${id}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json(result);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const cancelLeaveController = async (req, res) => {
  try {
    const { id } = req.params;
    const employee_id = req.user.employee_id;
    const userId = req.user.id;
    const companyId = req.user.company_id;

    if (!employee_id) {
      return res.status(400).json({ result: false, message: "User is not associated with an employee profile." });
    }

    const result = await CancelLeave(id, employee_id);

    // Audit Log
    await addAuditLog(
      userId,
      companyId,
      "Leave",
      "CANCEL",
      `Cancelled leave request #${id}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json(result);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
