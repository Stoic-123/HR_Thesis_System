import { db } from "../config/db.js";

export const createTimeMode = async (name, company_id, remark) => {
  try {
    const sql = "INSERT INTO timemode (name,company_id,remark) VALUES(?,?,?)";
    const [timeModeResult] = await db.execute(sql, [name, company_id, remark]);
    if (timeModeResult.affectedRows === 0) {
      return {
        result: false,
        message: "Failed to create timemode..!",
      };
    }
    return {
      result: true,
      message: "Timemode created successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const getTimeMode = async (company_id) => {
  try {
    const sql = "SELECT * FROM timemode WHERE company_id=?";
    const [timeModeData] = await db.execute(sql, [company_id]);
    if (timeModeData.length === 0) {
      return {
        result: false,
        message: "No timemode data in database..!",
      };
    }
    return {
      result: true,
      message: "Get timemode data successfully.",
      data: timeModeData,
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
