import { db } from "../config/db.js";

export const getUser = async (company_id) => {
  try {
    const sql =
      "SELECT u.id, u.username, p.name as position, d.name as department, e.telegram_username, e.email, r.name FROM user u INNER JOIN employee e ON u.employee_id = e.id INNER JOIN positions p ON e.position_id = p.id INNER JOIN department d ON e.department_id = d.id INNER JOIN role r ON e.role_id = r.id WHERE e.company_id = ?";
    const [result] = await db.execute(sql, [company_id]);
    if (result.length === 0) {
      return {
        result: false,
        message: "No user data in database..!",
      };
    }
    return {
      result: true,
      message: "Get user data successfully.",
      data: result,
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const updateUser = async (
  telegram_username,
  email,
  role_id,
  user_id,
) => {
  try {
    const sql = `UPDATE employee AS e
       INNER JOIN user AS u ON u.employee_id = e.id
       SET e.telegram_username = ?, 
           e.email = ?,
           e.role_id = ?  
       WHERE u.id = ?`;
    const [userResults] = await db.execute(sql, [
      telegram_username,
      email,
      role_id,
      user_id,
    ]);
    if (userResults.changedRows === 0) {
      return {
        result: false,
        message: "Failed to update user..!",
      };
    }
    return {
      result: true,
      message: "User updated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
