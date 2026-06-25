import prisma from "../lib/prisma.js";
import {
  createOvertime,
  getMyOvertimes,
  getAllOvertimes,
  getPendingOvertimesForManager,
  approveOvertime,
  rejectOvertime,
  cancelOvertime,
} from "../service/Overtime.js";
import { addAuditLog } from "../service/AuditLog.js";
import { formatICTDate } from "../utils/timezone.js";

export const createOvertimeController = async (req, res) => {
  try {
    const { start_date, end_date, reason } = req.body;
    const employee_id = req.user.employee_id;
    const user_id = req.user.id;
    const company_id = req.user.company_id;

    if (!employee_id) {
      return res.status(400).json({
        result: false,
        message: "User is not associated with an employee profile",
      });
    }

    const result = await createOvertime(employee_id, start_date, end_date, reason, company_id);

    // Audit log
    await addAuditLog(
      user_id,
      company_id,
      "Overtime",
      "CREATE",
      "Created overtime request",
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

export const getMyOvertimesController = async (req, res) => {
  try {
    const employee_id = req.user.employee_id;

    if (!employee_id) {
      return res.status(400).json({
        result: false,
        message: "User is not associated with an employee profile",
      });
    }

    const result = await getMyOvertimes(employee_id);
    
    // Format the response
    const formattedData = result.data.map((ot) => {
      const start = ot.start_date;
      const end = ot.end_date;
      const diffTime = Math.abs(new Date(end) - new Date(start));
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      return {
        id: ot.id,
        employee_name: req.user.username || "Employee",
        status: ot.status,
        start_date: ot.start_date,
        end_date: ot.end_date,
        startDate: formatICTDate(start),
        endDate: formatICTDate(end),
        duration: `${diffHours} ${diffHours === 1 ? "hour" : "hours"}`,
        reason: ot.reason || "No reason",
      };
    });

    res.status(200).json({ ...result, data: formattedData });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getPendingOvertimesForManagerController = async (req, res) => {
  try {
    const manager_employee_id = req.user.employee_id;
    const company_id = req.user.company_id;

    if (!manager_employee_id) {
      return res.status(400).json({ result: false, message: "Manager employee ID is required" });
    }

    const pendingOvertimes = await getPendingOvertimesForManager(manager_employee_id, company_id);

    // Format the response
    const formattedOvertimes = pendingOvertimes.map((ot) => {
      const start = ot.start_date;
      const end = ot.end_date;
      return {
        id: ot.id,
        employee: `${ot.employee_overtime_employee_idToemployee.first_name} ${ot.employee_overtime_employee_idToemployee.last_name}`,
        department: ot.employee_overtime_employee_idToemployee.department_employee_department_idTodepartment?.name || null,
        position: ot.employee_overtime_employee_idToemployee.positions?.name || null,
        type: "Overtime",
        from: formatICTDate(start),
        to: formatICTDate(end),
        start_date: ot.start_date,
        end_date: ot.end_date,
        status: ot.status,
        reason: ot.reason,
        request_at: ot.created_at,
      };
    });

    res.status(200).json({ result: true, data: formattedOvertimes });
  } catch (error) {
    console.error("Error in getPendingOvertimesForManagerController:", error);
    res.status(500).json({ result: false, message: error.message || "Internal Server Error" });
  }
};

export const getAllOvertimesController = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const employee_id = req.user.employee_id;

    // Fetch user role and department to check access permissions
    const currentEmployee = await prisma.employee.findUnique({
      where: { id: employee_id },
      include: { role: true },
    });

    const isHrOrAdmin =
      currentEmployee?.role?.name?.toLowerCase().includes("admin") ||
      currentEmployee?.role?.name?.toLowerCase().includes("hr");

    let deptId = null;
    if (!isHrOrAdmin && currentEmployee?.department_id) {
      deptId = currentEmployee.department_id;
    }

    const overtimes = await getAllOvertimes(company_id, deptId);
    const formattedOvertimes = overtimes.map((ot) => {
      return {
        id: ot.id,
        employee_id: ot.employee_id,
        employee_overtime_employee_idToemployee: ot.employee_overtime_employee_idToemployee
          ? {
              id: ot.employee_overtime_employee_idToemployee.id,
              first_name: ot.employee_overtime_employee_idToemployee.first_name,
              last_name: ot.employee_overtime_employee_idToemployee.last_name,
            }
          : null,
        start_date: ot.start_date,
        end_date: ot.end_date,
        reason: ot.reason,
        status: ot.status,
      };
    });

    res.status(200).json({ result: true, data: formattedOvertimes });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const approveOvertimeController = async (req, res) => {
  try {
    const { id } = req.params;
    const approved_by = req.user.employee_id;
    const user_id = req.user.id;
    const company_id = req.user.company_id;

    if (!approved_by) {
      return res.status(400).json({
        result: false,
        message: "User is not associated with an employee profile",
      });
    }

    const result = await approveOvertime(id, approved_by);

    // Audit log
    await addAuditLog(
      user_id,
      company_id,
      "Overtime",
      "APPROVE",
      `Approved overtime request #${id}`,
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

export const rejectOvertimeController = async (req, res) => {
  try {
    const { id } = req.params;
    const approved_by = req.user.employee_id;
    const user_id = req.user.id;
    const company_id = req.user.company_id;

    if (!approved_by) {
      return res.status(400).json({
        result: false,
        message: "User is not associated with an employee profile",
      });
    }

    const result = await rejectOvertime(id, approved_by);

    // Audit log
    await addAuditLog(
      user_id,
      company_id,
      "Overtime",
      "REJECT",
      `Rejected overtime request #${id}`,
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

export const cancelOvertimeController = async (req, res) => {
  try {
    const { id } = req.params;
    const employee_id = req.user.employee_id;
    const user_id = req.user.id;
    const company_id = req.user.company_id;

    if (!employee_id) {
      return res.status(400).json({
        result: false,
        message: "User is not associated with an employee profile",
      });
    }

    const result = await cancelOvertime(id, employee_id);

    // Audit log
    await addAuditLog(
      user_id,
      company_id,
      "Overtime",
      "CANCEL",
      `Cancelled overtime request #${id}`,
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
