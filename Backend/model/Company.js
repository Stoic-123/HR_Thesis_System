import { db } from "../config/db.js";

export const addCompany = async (
  name,
  phone,
  email,
  primary_color,
  secondary_color,
  logo_path,
  telegram_group_id,
  telegram_bot_token
) => {
  try {
    const sql = `INSERT INTO Company (name,phone,email,primary_color,secondary_color,logo_path,telegram_group_id,telegram_bot_token) VALUE(?,?,?,?,?,?,?,?)`;

    const [companyResult] = await db.execute(sql, [
      name,
      phone,
      email,
      primary_color,
      secondary_color,
      logo_path,
      telegram_group_id,
      telegram_bot_token,
    ]);
    if (companyResult.affectedRows === 0) {
      return {
        result: false,
        message: "Failed to create company..!",
      };
    }
    return {
      result: true,
      message: "Company created successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const getCompany = async () => {
  try {
    const sql = "SELECT * FROM Company";
    const [companyRecord] = await db.execute(sql);
    if (companyRecord.length === 0) {
      return {
        result: false,
        message: "No Company data in database..!",
      };
    }
    return {
      result: true,
      message: "Get Company data successfully.",
      data: companyRecord,
    };
  } catch (error) {
    console.log(error.message);
    throw error.message;
  }
};
