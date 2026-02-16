import { db } from "../config/db.js";

export const employeeChecker = async (username) => {
  try {
    const sql = "SELECT * FROM user WHERE username=?";
    const [results] = await db.execute(sql, [username]);
    if (results.length === 0) {
      return {
        result: false,
        message: "This username not found on the system..!",
      };
    }
    return results[0];
  } catch (error) {
    console.log(error.message);
    throw error.message;
  }
};

export const getCompanyID = async (employee_id) => {
  try {
    const sql = "SELECT company_id FROM employee WHERE id =?";
    const [results] = await db.execute(sql, [employee_id]);
    if (results.length === 0) {
      return {
        result: false,
        message: "This employee not found in the system..!",
      };
    }
    return results[0];
  } catch (error) {
    console.log(error.message);
    throw error.message;
  }
};
export const InvalidateToken = async (user_id) => {
  try {
    const sql = `UPDATE user 
     SET token_version = token_version + 1
     WHERE id = ?`;
    const [results] = await db.execute(sql, [user_id]);
    if (results.changedRows === 0) {
      return {
        result: false,
        message: "Failed to updated token version..!",
      };
    }
    return {
      result: true,
      message: "Invalidate token successfully..!",
    };
  } catch (error) {
    console.log(error.message);
    throw error.message;
  }
};
