import { addCompany, getCompany, updateCompany } from "../service/Company.js";
import { addAuditLog } from "../service/AuditLog.js";
import path from "path";
import fs from "fs";


export const addCompanyController = async (req, res) => {
  try {
    let logoPath = null;
    if (req.files) {
      if (req.files.logo_path) {
        const logo = req.files.logo_path;
        const logo_name = Date.now() + "_" + logo.name;
        const uploadPath = "./public/uploads/logos/" + logo_name;
        await logo.mv(uploadPath);
        logoPath = "/uploads/logos/" + logo_name;
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
      const logo = req.files.logo_path;
      const logo_name = Date.now() + "_" + logo.name;
      const uploadPath = "./public/uploads/logos/" + logo_name;

      // Save new file
      await logo.mv(uploadPath);

      // Set new path for DB
      logo_path = "/uploads/logos/" + logo_name;

      if (old_logo_path) {
        const oldFile = path.join("./public", old_logo_path);
        if (fs.existsSync(oldFile)) {
          fs.unlinkSync(oldFile);
        }
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
