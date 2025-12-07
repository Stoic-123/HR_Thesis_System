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
    const sql = `
      SELECT p.* 
      FROM positions p
      LEFT JOIN department d ON p.department_id = d.id
      WHERE p.is_active = 1 AND d.company_id = ?
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
export const updatePosition = async (name, department_id, pisition_id) => {
  try {
    if (department_id === "" || department_id === undefined) {
      department_id = null;
    }
    const sql = "UPDATE positions SET name=?,department_id=? WHERE id=?";
    const [positionResult] = await db.execute(sql, [
      name,
      department_id,
      pisition_id,
    ]);
    if (positionResult.affectedRows === 0) {
      return {
        result: false,
        message: "Failed to update position..!",
      };
    }
    return {
      result: true,
      message: "Position updated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const deletePosition = async (position_id) => {
  try {
    const sql = "DELETE FROM positions WHERE id=?";
    const checkPositionInUsedSql = "SELECT * from employee WHERE position_id=?";
    const [checkPositionInUsed] = await db.execute(checkPositionInUsedSql, [
      position_id,
    ]);
    const [positionResult] = await db.execute(sql, [position_id]);
    if (positionResult.affectedRows === 0) {
      return {
        result: false,
        message: "Failed to delete position..!",
      };
    }
    if (checkPositionInUsed.length != 0) {
      return {
        result: false,
        message: "Position is in used, you cannot delete this position..!",
      };
    }
    return {
      result: true,
      message: "Positon deleted successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
