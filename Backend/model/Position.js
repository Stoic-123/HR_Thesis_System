import { db } from "../config/db.js";

export const addPosition = async (name, department_id) => {
  try {
    const sql = "INSERT INTO `positions` (name, department_id) VALUES (?,?)";

    const [result] = await db.execute(sql, [name, department_id]);

    return {
      result: true,
      message: "Position created successfully.",
    };
  } catch (error) {
    console.error("DB ERROR:", error);
    throw error;
  }
};

export const getPosition = async (company_id) => {
  try {
    // If you need to get positions by company_id through departments
    const sql = `
      SELECT p.* 
      FROM positions p
      LEFT JOIN department d ON p.department_id = d.id
      WHERE d.company_id = ?
    `;
    const [positionResult] = await db.execute(sql, [company_id]);
    if (positionResult.length === 0) {
      return {
        result: false,
        message: "No position data in database..!",
      };
    }
    return {
      result: true,
      data: positionResult,
    };
  } catch (error) {
    console.error("DB ERROR:", error);
    throw error;
  }
};
