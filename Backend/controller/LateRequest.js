import {
  createLateRequest,
  approveLateRequest,
  rejectLateRequest,
  getAllLateRequests,
  getMyLateRequests,
  getPendingLateRequestsForManager,
} from "../service/LateRequest.js";
import { addAuditLog } from "../service/AuditLog.js";

export const createLateRequestController = async (req, res) => {
  try {
    const userId = req.user.id;
    const employeeId = req.user.employee_id;
    const companyId = req.user.company_id;

    if (!employeeId) {
      return res.status(400).json({
        result: false,
        message: "User is not associated with an employee profile.",
      });
    }

    const { reason, request_date } = req.body;

    const result = await createLateRequest({
      employee_id: employeeId,
      company_id: companyId,
      reason,
      request_date,
    });

    await addAuditLog(
      userId,
      companyId,
      "LateRequest",
      "CREATE",
      `Created late request: ${reason || "Late"}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("[LateRequest Controller] create error:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getMyLateRequestsController = async (req, res) => {
  try {
    const employeeId = req.user.employee_id;
    if (!employeeId) {
      return res.status(400).json({
        result: false,
        message: "User is not associated with an employee profile.",
      });
    }

    const result = await getMyLateRequests(employeeId);
    res.status(200).json(result);
  } catch (error) {
    console.error("[LateRequest Controller] getMy error:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getAllLateRequestsController = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { start_date, end_date, department_id, employee_id, status } = req.query;

    const result = await getAllLateRequests(companyId, {
      start_date,
      end_date,
      department_id,
      employee_id,
      status,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("[LateRequest Controller] getAll error:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getPendingLateRequestsController = async (req, res) => {
  try {
    const employeeId = req.user.employee_id;
    const companyId = req.user.company_id;

    if (!employeeId) {
      return res.status(400).json({
        result: false,
        message: "User is not associated with an employee profile.",
      });
    }

    const result = await getPendingLateRequestsForManager(employeeId, companyId);
    res.status(200).json(result);
  } catch (error) {
    console.error("[LateRequest Controller] getPending error:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const approveLateRequestController = async (req, res) => {
  try {
    const { id } = req.params;
    const approverEmployeeId = req.user.employee_id;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const result = await approveLateRequest(id, approverEmployeeId);

    if (result.result) {
      await addAuditLog(
        userId,
        companyId,
        "LateRequest",
        "APPROVE",
        `Approved late request #${id}`,
        null,
        req.ip,
        req.headers["user-agent"]
      );
    }

    res.status(result.result ? 200 : 400).json(result);
  } catch (error) {
    console.error("[LateRequest Controller] approve error:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const rejectLateRequestController = async (req, res) => {
  try {
    const { id } = req.params;
    const approverEmployeeId = req.user.employee_id;
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const result = await rejectLateRequest(id, approverEmployeeId);

    if (result.result) {
      await addAuditLog(
        userId,
        companyId,
        "LateRequest",
        "REJECT",
        `Rejected late request #${id}`,
        null,
        req.ip,
        req.headers["user-agent"]
      );
    }

    res.status(result.result ? 200 : 400).json(result);
  } catch (error) {
    console.error("[LateRequest Controller] reject error:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
