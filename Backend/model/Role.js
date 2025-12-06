import { db } from "../config/db.js";

export const addRole = async (name, company_id) => {
  try {
    const sql = "INSERT INTO role (name,company_id) VALUES(?,?)";
    const [roleResult] = await db.execute(sql, [name, company_id]);
    if (roleResult.affectedRows === 0) {
      return {
        result: false,
        message: "Failed to create role..!",
      };
    }
    return {
      result: true,
      message: "Role created successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const getRole = async (company_id) => {
  try {
    const sql = "SELECT * FROM role WHERE company_id=?";
    const [roleData] = await db.execute(sql, [company_id]);
    if (roleData.length === 0) {
      return {
        result: false,
        message: "No role data in database..!",
      };
    }
    return {
      result: true,
      message: "Get role data successfully.",
      data: roleData,
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
