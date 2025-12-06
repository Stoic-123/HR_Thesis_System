import { db } from "../config/db.js";
export const addDepartment = async (name, manager_id = null, company_id) => {
  try {
    const sql =
      "INSERT INTO department (name,manager_id,company_id) VALUES(?,?,?)";
    const [departmentData] = await db.execute(sql, [
      name,
      manager_id,
      company_id,
    ]);

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
export const getDepartment = async (company_id, is_active = null) => {
  try {
    let sql = "SELECT * FROM department WHERE company_id=?";
    let params = [company_id];

    // Add is_active condition only if provided
    if (is_active !== null && is_active !== undefined) {
      sql += " AND is_active=?";
      params.push(is_active);
    }
    const [departmentResult] = await db.execute(sql, params);
    if (departmentResult.length === 0) {
      return {
        result: false,
        message: "No Department data in database..!",
      };
    }
    return {
      result: true,
      message: "Get Department data successfully.",
      data: departmentResult,
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const updateDepartment = async (
  name,
  manager_id,
  company_id,
  department_id
) => {
  try {
    // Convert empty string to null
    if (manager_id === "" || manager_id === undefined) {
      manager_id = null;
    }
    const sql =
      "UPDATE department SET name=?,manager_id=?,company_id=? WHERE id=?";
    const [departmentResult] = await db.execute(sql, [
      name,
      manager_id,
      company_id,
      department_id,
    ]);
    if (departmentResult.affectedRows === 0) {
      return {
        result: false,
        message: "Failed to update department..!",
      };
    }
    return {
      result: true,
      message: "Department updated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const deactivatedDepartment = async (department_id) => {
  try {
    const sql = "UPDATE department SET is_active = 0 WHERE id=?";
    const setUserToNullSql =
      "UPDATE employee SET department_id= NULL, position_id= NULL WHERE department_id=?";
    const [deactivatedDepartmentResult] = await db.execute(sql, [
      department_id,
    ]);
    if (deactivatedDepartmentResult.affectedRows === 0) {
      return {
        result: false,
        message: "Failed to deactivate department..!",
      };
    }
    await db.execute(setUserToNullSql, [department_id]);
    return {
      result: true,
      message: "Department deactivated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const activatedDepartment = async (department_id) => {
  try {
    const sql = "UPDATE department SET is_active = 1 WHERE id=?";
    const [activatedDepartmentResult] = await db.execute(sql, [department_id]);
    if (activatedDepartmentResult.affectedRows === 0) {
      return {
        result: false,
        message: "Failed to activate department..!",
      };
    }
    return {
      result: true,
      message: "Department activated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
