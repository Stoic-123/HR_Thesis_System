import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { encrypt, decrypt, maskSalary } from "../utils/crypto.js";
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
  is_active = "active",
  base_salary = null,
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
        base_salary:
          base_salary !== null && base_salary !== undefined && base_salary !== ""
            ? encrypt(String(base_salary))
            : encrypt("0"),
      },
    });

    const employeeId = employee.id;
    const username = `${first_name} ${last_name}`;

    // Get company's default password setting, fallback to "Hr12345"
    const companyInfo = await prisma.company.findUnique({
      where: { id: parseInt(company_id) },
      select: { default_password: true },
    });
    const defaultPassword = companyInfo?.default_password || "Hr12345";

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
export const getAllEmployee = async (company_id, page = 1, limit = 10, status = null, department_id = null) => {
  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let where = { company_id: parseInt(company_id) };
    if (status) {
      where.is_active = status;
    }
    if (department_id) {
      where.department_id = parseInt(department_id);
    }

    const [employees, total, total_active] = await Promise.all([
      prisma.employee.findMany({
        where,
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
        skip,
        take,
      }),
      prisma.employee.count({
        where,
      }),
      prisma.employee.count({
        where: {
          company_id: parseInt(company_id),
          is_active: "active",
        },
      }),
    ]);

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
      status: emp.is_active,
      profile_path: emp.profile_path,
      position_name: emp.positions?.name || null,
      department_name:
        emp.department_employee_department_idTodepartment?.name || null,
      role_name: emp.role?.name || null,
      telegram_username: emp.telegram_username,
      base_salary: emp.base_salary != null ? maskSalary(decrypt(emp.base_salary)) : "0",
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
      pagination: {
        total,
        total_active,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
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
export const getEmployee = async (employee_id) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: {
        id: parseInt(employee_id),
      },
      include: {
        positions: true,
        department_employee_department_idTodepartment: true,
        role: true,
        location: true,
        document: {
          include: {
            documenttype: true,
          },
        },
      },
    });

    const formattedEmployees = {
      id: employee.id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      full_name: `${employee.first_name} ${employee.last_name}`,
      age: employee.age,
      gender: employee.gender,
      phone_number1: employee.phone_number1,
      phone_number2: employee.phone_number2,
      email: employee.email,
      address: employee.address,
      status: employee.is_active,
      profile_path: employee.profile_path,
      department_id: employee.department_id,
      position_id: employee.position_id,
      role_id: employee.role_id,
      position_name: employee.positions?.name || null,
      department_name:
        employee.department_employee_department_idTodepartment?.name || null,
      role_name: employee.role?.name || null,
      telegram_username: employee.telegram_username,
      base_salary: employee.base_salary != null ? maskSalary(decrypt(employee.base_salary)) : "0",
      location: employee.location?.name || "No Location",
      document: employee.document.map((doc) => ({
        id: doc.id,
        document_name: doc.documenttype?.name || null,
        document_path: doc.document_path,
      })),
      relationship_info: {
        relationship_status: employee.relationship_status,
        partner_name: employee.partner_name,
        partner_age: employee.partner_age,
        partner_occupation: employee.partner_occupation,
        total_children: employee.total_children,
        total_daughters: employee.total_daughters,
        total_sons: employee.total_sons,
      },
      family_info: {
        father_name: employee.father_name,
        father_age: employee.father_age,
        father_occupation: employee.father_occupation,
        father_live_status: employee.father_life_status,
        mother_name: employee.mother_name,
        mother_age: employee.mother_age,
        mother_occupation: employee.mother_occupation,
        mother_live_status: employee.mother_life_status,
        female_sibling: employee.female_sibling,
      },
      guardian_info: {
        guardian_name: employee.guardian_name,
        guardian_phone_number: employee.guardian_phone_number,
        guardian_relationship: employee.guardian_relationship,
      },
      joined_at: employee.joined_at ? employee.joined_at.toISOString().split('T')[0] : null,
    };

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

export const updateEmployee = async (id, updateData) => {
  try {
    const data = { ...updateData };
    
    // Numeric fields conversion (Only if they exist in updateData)
    const intFields = [
      "age", "position_id", "department_id", "role_id",
      "partner_age", "total_children", "total_sons", "total_daughters",
      "father_age", "mother_age"
    ];

    intFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        if (data[field] === "" || data[field] === null || data[field] === undefined) {
          data[field] = null;
        } else {
          data[field] = parseInt(data[field]);
        }
      }
    });

    if (Object.prototype.hasOwnProperty.call(data, "base_salary")) {
      if (typeof data.base_salary === "string" && data.base_salary.includes("*")) {
        // Ignored because it's a masked value from the UI
        delete data.base_salary;
      } else if (data.base_salary === "" || data.base_salary === null || data.base_salary === undefined) {
        data.base_salary = encrypt("0");
      } else {
        data.base_salary = encrypt(String(data.base_salary));
      }
    }

    // Remove company_id from update - it should not be changed via profile edit
    delete data.company_id;

    // Handle Dates (Only if provided)
    if (Object.prototype.hasOwnProperty.call(data, "joined_at")) {
      if (data.joined_at) {
        data.joined_at = new Date(data.joined_at);
      } else {
        data.joined_at = null;
      }
    }

    // Handle Enums and empty strings for text fields (Only if provided)
    const optionalTextFields = [
      "phone_number2", "telegram_username", "partner_name", 
      "partner_occupation", "father_name", "mother_name",
      "guardian_name", "guardian_phone_number", "guardian_relationship",
      "address", "email"
    ];

    optionalTextFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        if (data[field] === "") {
          data[field] = null;
        }
      }
    });

    // Fix naming discrepancy for live/life status
    if (data.father_live_status !== undefined) {
      data.father_life_status = data.father_live_status;
      delete data.father_live_status;
    }
    if (data.mother_live_status !== undefined) {
      data.mother_life_status = data.mother_live_status;
      delete data.mother_live_status;
    }

    // Map scalar relation IDs to Prisma nested update objects
    // Use hasOwnProperty to ensure we only update what was passed
    if (Object.prototype.hasOwnProperty.call(data, "department_id")) {
      data.department_employee_department_idTodepartment = data.department_id 
        ? { connect: { id: data.department_id } } 
        : { disconnect: true };
      delete data.department_id;
    }
    
    if (Object.prototype.hasOwnProperty.call(data, "position_id")) {
      data.positions = data.position_id 
        ? { connect: { id: data.position_id } } 
        : { disconnect: true };
      delete data.position_id;
    }

    if (Object.prototype.hasOwnProperty.call(data, "role_id")) {
      data.role = data.role_id 
        ? { connect: { id: data.role_id } } 
        : { disconnect: true };
      delete data.role_id;
    }

    // Auto-transfer telegram_chat_id when telegram_username is changed or reassigned
    if (Object.prototype.hasOwnProperty.call(data, "telegram_username")) {
      const existing = await prisma.employee.findUnique({
        where: { id: parseInt(id) },
        select: { telegram_username: true, telegram_chat_id: true, company_id: true }
      });

      if (existing) {
        const oldUsername = existing.telegram_username ? existing.telegram_username.trim().toLowerCase() : null;
        const newUsername = data.telegram_username ? data.telegram_username.trim().toLowerCase() : null;

        if (oldUsername !== newUsername) {
          // Case 1: We are setting a new username (e.g. Admin is taking over @Lo_ng999)
          // Look for any other employee who currently has this new username and a chat ID
          if (newUsername) {
            const sourceEmployee = await prisma.employee.findFirst({
              where: {
                company_id: existing.company_id,
                id: { not: parseInt(id) },
                telegram_username: {
                  equals: data.telegram_username
                },
                telegram_chat_id: { not: null }
              }
            });

            if (sourceEmployee) {
              console.log(`[Telegram Transfer] Moving chat ID ${sourceEmployee.telegram_chat_id} from Employee ${sourceEmployee.id} to Employee ${id} due to username takeover of ${data.telegram_username}`);
              data.telegram_chat_id = sourceEmployee.telegram_chat_id;
              
              // Clear the chat ID from the source employee record
              await prisma.employee.update({
                where: { id: sourceEmployee.id },
                data: { telegram_chat_id: null }
              });
            }
          }

          // Case 2: We are changing this employee's username to something else (e.g. Employee A is changing from @Lo_ng999 to @employee_a)
          // Check if there is another employee who has the old username (@Lo_ng999) but has no chat ID.
          // If so, we transfer this employee's current chat ID to them.
          if (oldUsername && existing.telegram_chat_id) {
            const targetEmployee = await prisma.employee.findFirst({
              where: {
                company_id: existing.company_id,
                id: { not: parseInt(id) },
                telegram_username: {
                  equals: existing.telegram_username
                },
                telegram_chat_id: null
              }
            });

            if (targetEmployee) {
              console.log(`[Telegram Transfer] Moving chat ID ${existing.telegram_chat_id} from Employee ${id} to Employee ${targetEmployee.id} due to username change from ${existing.telegram_username}`);
              
              await prisma.employee.update({
                where: { id: targetEmployee.id },
                data: { telegram_chat_id: existing.telegram_chat_id }
              });
              
              data.telegram_chat_id = null;
            }
          }
        }
      }
    }

    const employee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data,
    });

    // Keep user.username in sync when name changes
    if (data.first_name !== undefined || data.last_name !== undefined) {
      // Fetch the latest names (merge with what was already in DB)
      const latest = await prisma.employee.findUnique({
        where:  { id: parseInt(id) },
        select: { first_name: true, last_name: true },
      });
      if (latest) {
        await prisma.user.updateMany({
          where: { employee_id: parseInt(id) },
          data:  { username: `${latest.first_name} ${latest.last_name}` },
        });
      }
    }

    return {
      result: true,
      message: "Employee updated successfully.",
      data: employee,
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const addDocument = async (employee_id, document_type_id, document_path) => {
  try {
    const document = await prisma.document.create({
      data: {
        employee_id: parseInt(employee_id),
        document_type_id: parseInt(document_type_id),
        document_path,
      },
    });

    return {
      result: true,
      message: "Document uploaded successfully.",
      data: document,
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const deleteDocument = async (id) => {
  try {
    const document = await prisma.document.delete({
      where: { id: parseInt(id) },
    });
    return {
      result: true,
      message: "Document deleted successfully.",
      data: document,
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const deleteEmployee = async (id) => {
  try {
    await prisma.employee.delete({
      where: { id: parseInt(id) },
    });
    return {
      result: true,
      message: "Employee deleted successfully.",
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
};
