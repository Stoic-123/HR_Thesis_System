import { db } from "../config/db.js";

export const addEmployee = async (employee, documents) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const sql =
      "INSERT INTO Employee (first_name, last_name, age, gender, phone_number1, phone_number2, address, profile_path, position, department, role_id, telegram_username, joined_at, company_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const [empResult] = await connection.execute(sql, [
      employee.first_name,
      employee.last_name,
      employee.age,
      employee.gender,
      employee.phone_number1,
      employee.phone_number2,
      employee.address,
      employee.profile_path,
      employee.position,
      employee.department,
      employee.role_id,
      employee.telegram_username,
      employee.joined_at,
      employee.company_id,
      employee.is_active,
    ]);
    const employeeId = empResult.insertId;
    const defaultPassword = "Hr12345";
    await connection.execute(
      "INSERT INTO User (employee_id, username, password) VALUES (?, ?, ?)",
      [employeeId, employee.username, defaultPassword]
    );

    if (documents && documents.length > 0) {
      for (const doc of documents) {
        await connection.execute(
          "INSERT INTO Document (employee_id, document_type, document_path) VALUES (?, ?, ?)",
          [employeeId, doc.type, doc.path]
        );
      }
    }

    await connection.commit();
    if (empResult.affectedRows === 0) {
      return {
        result: false,
        message: "Failed to create employee..!",
      };
    }
    return {
      id: employeeId,
      result: true,
      message: "Employee created successfully.",
    };
  } catch (error) {
    await connection.rollback();
    console.log(error);
    throw error;
  } finally {
    connection.release();
  }
};
