import { addEmployee, emailCheck, getAllEmployee } from "../model/Employee.js";

export const addEmployeeController = async (req, res) => {
  try {
    let profile_path = null;
    let documents = [];

    if (req.files) {
      if (req.files.profile_path) {
        const profile = req.files.profile_path;
        const profileName = Date.now() + "_" + profile.name;
        const uploadPath = "./public/uploads/profiles/" + profileName;
        await profile.mv(uploadPath);
        profile_path = "/uploads/profiles/" + profileName;
      }

      if (req.files.document_path) {
        const docs = Array.isArray(req.files.document_path)
          ? req.files.document_path
          : [req.files.document_path];
        for (const doc of docs) {
          const docName = Date.now() + "_" + doc.name;
          const uploadPath = "./public/uploads/documents/" + docName;
          await doc.mv(uploadPath);
          documents.push({
            path: "/uploads/documents/" + docName,
            type: req.body.document_type_id || 1,
          });
        }
      }
    }
    const {
      first_name,
      last_name,
      age,
      gender,
      phone_number1,
      phone_number2,
      email,
      address,
      position_id,
      department_id,
      role_id,
      telegram_username,
      joined_at,
      company_id,
      is_active,
    } = req.body;

    const mailCheck = await emailCheck(email);
    if (mailCheck.result) {
      return res.status(400).json({
        result: false,
        message: "Email already existed in database..!",
      });
    }
    const employeeInsertData = await addEmployee(
      first_name,
      last_name,
      age,
      gender,
      phone_number1,
      phone_number2,
      email,
      address,
      profile_path,
      position_id,
      department_id,
      role_id,
      telegram_username,
      joined_at,
      company_id,
      is_active,
      documents
    );
    res.status(200).json({ employeeInsertData });
  } catch (error) {
    console.error("Error adding employee:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const getAllEmployeeController = async (req, res) => {
  try {
    const { company_id } = req.params;
    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company_id is required..!" });
    }
    const employeeGetData = await getAllEmployee(company_id);
    res.status(200).json(employeeGetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
