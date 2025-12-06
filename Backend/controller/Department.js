import {
  activatedDepartment,
  addDepartment,
  deactivatedDepartment,
  getDepartment,
  updateDepartment,
} from "../model/Department.js";

export const addDepartmentController = async (req, res) => {
  try {
    const { name, manager_id, company_id } = req.body;

    if (!name || !company_id) {
      return res.status(400).json({
        result: false,
        message: "Name and company_id are required..!",
      });
    }
    const departmentInsertData = await addDepartment(
      name,
      manager_id,
      company_id
    );
    res.status(201).json(departmentInsertData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const getDepartmentController = async (req, res) => {
  try {
    const { company_id, is_active } = req.params;
    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company_id are required..!" });
    }
    const departmentGetData = await getDepartment(
      company_id,
      is_active !== undefined ? Number(is_active) : null
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
    const { name, manager_id, company_id } = req.body;
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
    res.status(200).json(departmentModifyResult);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const deactivatedDepartmentController = async (req, res) => {
  try {
    const { department_id } = req.params;
    if (!department_id) {
      return res
        .status(400)
        .json({ result: false, message: "id is required..!" });
    }
    const departmentModifyResult = await deactivatedDepartment(department_id);
    res.status(200).json(departmentModifyResult);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const activatedDepartmentController = async (req, res) => {
  try {
    const { department_id } = req.params;
    if (!department_id) {
      return res
        .status(400)
        .json({ result: false, message: "id is required..!" });
    }
    const departmentModifyResult = await activatedDepartment(department_id);
    res.status(200).json(departmentModifyResult);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
