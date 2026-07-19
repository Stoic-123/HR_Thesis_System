import { addCompany, getCompany, updateCompany } from "../service/Company.js";
import { addAuditLog } from "../service/AuditLog.js";
import { validateFile } from "../utils/fileValidation.js";
import { uploadToStorage, deleteFromStorage } from "../service/Storage.js";


export const addCompanyController = async (req, res) => {
  try {
    let logoPath = null;
    if (req.files) {
      if (req.files.logo_path) {
        const fileCheck = validateFile(req.files.logo_path, "image");
        if (!fileCheck.isValid) {
          return res.status(400).json({ result: false, message: fileCheck.message });
        }
        const logo = req.files.logo_path;
        const logo_name = Date.now() + "_" + logo.name;
        logoPath = await uploadToStorage(logo.data, "logos", logo_name, logo.mimetype);
      }
    }
    const {
      name,
      phone,
      email,
      primary_color,
      secondary_color,
      telegram_group_id,
      telegram_attendance_group_id,
      telegram_leave_group_id,
      telegram_overtime_group_id,
      telegram_announcement_group_id,
      telegram_backup_group_id,
      telegram_bot_token,
      ai_provider,
      ai_api_key,
      ai_model,
    } = req.body;
    if (!name) {
      res
        .status(400)
        .json({ result: false, message: "Company name is required..!" });
    }
    const companyInsertData = await addCompany(
      name,
      phone,
      email,
      primary_color,
      secondary_color,
      logoPath,
      telegram_group_id,
      telegram_attendance_group_id,
      telegram_leave_group_id,
      telegram_overtime_group_id,
      telegram_announcement_group_id,
      telegram_backup_group_id,
      telegram_bot_token,
      undefined,
      ai_provider,
      ai_api_key,
      ai_model
    );

    // Audit Log
    await addAuditLog(
      req.user.id,
      companyInsertData.id,
      "Company",
      "CREATE",
      `Created new company: ${name}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json(companyInsertData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const getCompanyController = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const companyData = await getCompany(company_id);
    res.status(200).json(companyData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const updateCompanyController = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      primary_color,
      secondary_color,
      telegram_group_id,
      telegram_attendance_group_id,
      telegram_leave_group_id,
      telegram_overtime_group_id,
      telegram_announcement_group_id,
      telegram_backup_group_id,
      telegram_bot_token,
      default_password,
      ai_provider,
      ai_api_key,
      ai_model,
      old_logo_path,
    } = req.body;
    const company_id = req.user.company_id;
    const user_id = req.user.id;

    if (!company_id) {
      return res.status(400).json({
        result: false,
        message: "Company ID context is required!",
      });
    }

    let logo_path = old_logo_path;

    if (req.files && req.files.logo_path) {
      const fileCheck = validateFile(req.files.logo_path, "image");
      if (!fileCheck.isValid) {
        return res.status(400).json({ result: false, message: fileCheck.message });
      }
      const logo = req.files.logo_path;
      const logo_name = Date.now() + "_" + logo.name;
      logo_path = await uploadToStorage(logo.data, "logos", logo_name, logo.mimetype);

      // Delete old logo from R2
      if (old_logo_path) {
        await deleteFromStorage(old_logo_path);
      }
    }

    const result = await updateCompany(
      name,
      phone,
      email,
      primary_color,
      secondary_color,
      logo_path,
      telegram_group_id,
      telegram_attendance_group_id,
      telegram_leave_group_id,
      telegram_overtime_group_id,
      telegram_announcement_group_id,
      telegram_backup_group_id,
      telegram_bot_token,
      default_password,
      ai_provider,
      ai_api_key,
      ai_model,
      company_id
    );

    // Audit Log
    await addAuditLog(
      user_id,
      company_id,
      "Company",
      "UPDATE",
      `Updated company information for ${name}`,
      null,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error.message });
  }
};
