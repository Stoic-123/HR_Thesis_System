import { addDepartment } from "../model/Department.js";

export const addDepartmentController = async (req, res) => {
  try {
    const { name, manager_id } = req.body;

    if (!name || !manager_id) {
      return res
        .status(400)
        .json({ result: false, message: "Name and manager are required..!" });
    }
    const departmentInsertData = await addDepartment(name, manager_id);
    res.status(200).json(departmentInsertData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
