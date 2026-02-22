import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
export const addEmployee = async (
  first_name,
  last_name,
  age = null,
  gender = "other",
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
  is_active = "active"
) => {
  try {
    const employee = await prisma.employee.create({
      data: {
        first_name,
        last_name,
        age: age ? parseInt(age) : null,
        gender,
        phone_number1,
        phone_number2,
        email,
        address,
        profile_path,
        position_id: position_id ? parseInt(position_id) : null,
        department_id: department_id ? parseInt(department_id) : null,
        role_id: role_id ? parseInt(role_id) : null,
        telegram_username,
        joined_at: joined_at ? new Date(joined_at) : null,
        company_id: parseInt(company_id),
        is_active,
      },
    });

    const employeeId = employee.id;
    const username = `${first_name} ${last_name}`;
    const defaultPassword = "Hr12345";
    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(defaultPassword, salt);

    await prisma.user.create({
      data: {
        employee_id: employeeId,
        username,
        password: hashPassword,
      },
    });

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
    const employees = await prisma.employee.findMany({
      where: {
        company_id: parseInt(company_id),
      },
      include: {
        positions: true,
        department_employee_department_idTodepartment: true,
        role: true,
        document: {
          include: {
            documenttype: true,
          },
        },
      },
    });

    if (employees.length === 0) {
      return {
        result: false,
        message: "No employee data in database..!",
      };
    }

    const formattedEmployees = employees.map((emp) => ({
      id: emp.id,
      first_name: emp.first_name,
      last_name: emp.last_name,
      full_name: `${emp.first_name} ${emp.last_name}`,
      age: emp.age,
      gender: emp.gender,
      phone_number1: emp.phone_number1,
      phone_number2: emp.phone_number2,
      email: emp.email,
      address: emp.address,
      profile_path: emp.profile_path,
      position_name: emp.positions?.name || null,
      department_name: emp.department_employee_department_idTodepartment?.name || null,
      role_name: emp.role?.name || null,
      telegram_username: emp.telegram_username,
      joined_at: emp.joined_at ? formatDate(emp.joined_at) : null,
      document: emp.document.map((doc) => ({
        document_name: doc.documenttype?.name || null,
        document_path: doc.document_path,
      })),
    }));

    return {
      result: true,
      message: "Get employee data successfully.",
      data: formattedEmployees,
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
    const emailResult = await prisma.employee.findMany({
      where: { email },
      select: { email: true },
    });
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
