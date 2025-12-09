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
export const getAllEmployee = async (company_id) => {
  try {
    const sql = `
      SELECT 
        e.id, e.first_name, e.last_name, e.age, e.gender,
        e.phone_number1, e.phone_number2, e.email, e.address,
        e.profile_path,
        p.name AS position_name,
        d.name AS department_name,
        r.name AS role_name,
        e.telegram_username,
        dt.name AS document_type_name,
        dc.document_path,
        e.joined_at
      FROM employee e
      LEFT JOIN positions p ON e.position_id = p.id
      LEFT JOIN department d ON e.department_id = d.id
      LEFT JOIN role r ON e.role_id = r.id
      LEFT JOIN document dc ON e.id = dc.employee_id
      LEFT JOIN documenttype dt ON dc.document_type_id = dt.id
      WHERE e.company_id = ?
    `;

    const [rows] = await db.execute(sql, [company_id]);

    if (rows.length === 0) {
      return {
        result: false,
        message: "No employee data in database..!",
      };
    }

    // --- Group employees ---
    const employees = {};

    rows.forEach((row) => {
      if (!employees[row.id]) {
        employees[row.id] = {
          id: row.id,
          first_name: row.first_name,
          last_name: row.last_name,
          full_name: row.first_name + " " + row.last_name,
          age: row.age,
          gender: row.gender,
          phone_number1: row.phone_number1,
          phone_number2: row.phone_number2,
          email: row.email,
          address: row.address,
          profile_path: row.profile_path,
          position_name: row.position_name,
          department_name: row.department_name,
          role_name: row.role_name,
          telegram_username: row.telegram_username,
          joined_at: formatDate(row.joined_at),

          // Your custom structure
          document: [],
        };
      }

      if (row.document_path) {
        employees[row.id].document.push({
          document_name: row.document_type_name,
          document_path: row.document_path,
        });
      }
    });

    return {
      result: true,
      message: "Get employee data successfully.",
      data: Object.values(employees),
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
function formatDate(dateString) {
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}
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
