import {
  activatedDepartment,
  addDepartment,
  deactivatedDepartment,
  getDepartment,
  updateDepartment,
} from "../service/Department.js";

export const addDepartmentController = async (req, res) => {
  try {
    const { name, manager_id } = req.body;
    const company_id = req.user.company_id;

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
    res.status(201).json(departmentInsertData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const getDepartmentController = async (req, res) => {
  try {
    const { is_active } = req.params;
    const company_id = req.user.company_id;

    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company context is required..!" });
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
    const { name, manager_id } = req.body;
    const company_id = req.user.company_id;

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
    const departmentModifyResult = await deactivatedDepartment(department_id, req.user.company_id);
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
    const departmentModifyResult = await activatedDepartment(department_id, req.user.company_id);
    res.status(200).json(departmentModifyResult);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
