import { addCompany, getCompany } from "../model/Company.js";

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
      primary_color,
      secondary_color,
      telegram_group_id,
      telegram_bot_token,
    } = req.body;
    if (!name) {
      res
        .status(400)
        .json({ result: false, message: "Company name is required..!" });
    }
    const companyInsertData = await addCompany(
      name,
      primary_color,
      secondary_color,
      logoPath,
      telegram_group_id,
      telegram_bot_token
    );
    res.status(200).json(companyInsertData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const getCompanyController = async (req, res) => {
  try {
    const companyData = await getCompany();
    res.status(200).json(companyData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
