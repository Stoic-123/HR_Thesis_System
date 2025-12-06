import { addRole, getRole } from "../model/Role.js";

export const addRoleController = async (req, res) => {
  try {
    const { name, company_id } = req.body;
    if (!name || !company_id) {
      return res.status(400).json({
        result: false,
        message: "Name and company_id are required..!",
      });
    }

    const roleInsertData = await addRole(name, company_id);
    res.status(200).json(roleInsertData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const getRoleController = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company_id is required..!" });
    }
    const roleGetData = await getRole(company_id);
    res.status(200).json(roleGetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
