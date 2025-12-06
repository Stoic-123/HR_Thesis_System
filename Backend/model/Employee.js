import { db } from "../config/db.js";
import bcrypt from "bcrypt";
export const addEmployee = async (
  first_name,
  last_name,
  age = null,
  gender = null,
  phone_number1 = null,
  phone_number2 = null,
  email = null,
  address = null,
  profile_path,
  position_id = null,
  department_id = null,
  role_id,
  telegram_username = null,
  joined_at = null,
  company_id,
  is_active,
  documents
) => {
  try {
    const sql =
      "INSERT INTO Employee (first_name, last_name, age, gender, phone_number1, phone_number2,email, address, profile_path, position_id, department_id, role_id, telegram_username,joined_at, company_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?, ?, ?, ?)";
    const [empResult] = await db.execute(sql, [
      first_name,
      last_name,
      age,
      gender,
      phone_number1,
      phone_number2,
      email,
      address,
      profile_path,
      position_id,
      department_id,
      role_id,
      telegram_username,
      joined_at,
      company_id,
      is_active,
    ]);

    const employeeId = empResult.insertId;
    const username = `${first_name} ${last_name}`;
    const defaultPassword = "Hr12345";
    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(defaultPassword, salt);
    await db.execute(
      "INSERT INTO User (employee_id, username, password) VALUES (?, ?, ?)",
      [employeeId, username, hashPassword]
    );

    if (documents && documents.length > 0) {
      for (const doc of documents) {
        await db.execute(
          "INSERT INTO Document (employee_id, document_type_id, document_path) VALUES (?, ?, ?)",
          [employeeId, doc.type, doc.path]
        );
      }
    }
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
    console.log(error);
    throw error;
  }
};
export const emailCheck = async (email) => {
  try {
    const sql = "SELECT email FROM employee where email=?";
    const [emailResult] = await db.execute(sql, [email]);
    if (emailResult.length === 0) {
      return {
        result: false,
        message: "Email not yet have in database..!",
      };
    }
    return {
      result: true,
      data: emailResult,
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
