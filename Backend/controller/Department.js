import {
  activatedDepartment,
  addDepartment,
  deactivatedDepartment,
  getDepartment,
  updateDepartment,
} from "../service/Department.js";
import { addAuditLog } from "../service/AuditLog.js";

export const addDepartmentController = async (req, res) => {
  try {
    const { name, manager_id } = req.body;
    const company_id = req.user.company_id;
    const user_id = req.user.id;

    if (!name || !company_id) {
      return res.status(400).json({
        result: false,
        message: "Name and company context are required..!",
      });
    }
    const departmentInsertData = await addDepartment(
      name,
      manager_id,
      company_id
    );

    // Audit Log
    await addAuditLog(
      user_id,
      company_id,
      "Department",
      "CREATE",
      `Created department: ${name}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(201).json(departmentInsertData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const getDepartmentController = async (req, res) => {
  try {
    const { is_active } = req.params;
    const { page, limit } = req.query;
    const company_id = req.user.company_id;

    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company context is required..!" });
    }
    let activeValue = null;
    if (is_active !== undefined && is_active !== "null") {
      activeValue = Number(is_active);
    }

    const departmentGetData = await getDepartment(
      company_id,
      activeValue,
      page,
      limit
    );
    res.status(200).json(departmentGetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const updatedDepartmentController = async (req, res) => {
  try {
    const { department_id } = req.params;
    const { name, manager_id } = req.body;
    const company_id = req.user.company_id;
    const user_id = req.user.id;

    if (!department_id) {
      return res
        .status(400)
        .json({ result: false, message: "id is required..!" });
    }
    
    const departmentModifyResult = await updateDepartment(
      name,
      manager_id,
      company_id,
      department_id
    );

    // Audit Log
    await addAuditLog(
      user_id,
      company_id,
      "Department",
      "UPDATE",
      `Updated department ID: ${department_id} to ${name}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json(departmentModifyResult);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const deactivatedDepartmentController = async (req, res) => {
  try {
    const { department_id } = req.params;
    const company_id = req.user.company_id;
    const user_id = req.user.id;

    if (!department_id) {
      return res
        .status(400)
        .json({ result: false, message: "id is required..!" });
    }
    const departmentModifyResult = await deactivatedDepartment(department_id, company_id);

    // Audit Log
    await addAuditLog(
      user_id,
      company_id,
      "Department",
      "DEACTIVATE",
      `Deactivated department ID: ${department_id}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json(departmentModifyResult);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const activatedDepartmentController = async (req, res) => {
  try {
    const { department_id } = req.params;
    const company_id = req.user.company_id;
    const user_id = req.user.id;

    if (!department_id) {
      return res
        .status(400)
        .json({ result: false, message: "id is required..!" });
    }
    const departmentModifyResult = await activatedDepartment(department_id, company_id);

    // Audit Log
    await addAuditLog(
      user_id,
      company_id,
      "Department",
      "ACTIVATE",
      `Activated department ID: ${department_id}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );
    res.status(200).json(departmentModifyResult);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
