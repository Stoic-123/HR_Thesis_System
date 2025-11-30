import { db } from "../config/db.js";
export const addDepartment = async (name, manager_id) => {
  try {
    const sql = "INSERT INTO department (name,manager_id) VALUES(?,?)";
    const [departmentData] = await db.execute(sql, [name, manager_id]);

    if (departmentData.affectedRows === 0) {
      return {
        result: false,
        message: "Failed to create department..!",
      };
    }
    return {
      result: true,
      message: "Department created successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
