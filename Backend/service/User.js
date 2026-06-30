import prisma from "../lib/prisma.js";

export const getUser = async (company_id, page = 1, limit = 10) => {
  try {
    const where = {
      employee: {
        company_id: parseInt(company_id),
      },
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          employee: {
            include: {
              positions: true,
              department_employee_department_idTodepartment: true,
              role: true,
            },
          },
        },
        skip,
        take,
      }),
      prisma.user.count({
        where,
      }),
    ]);

    if (users.length === 0) {
      return {
        result: false,
        message: "No user data in database..!",
      };
    }

    const result = users.map((u) => ({
      id: u.id,
      username: u.username,
      position: u.employee?.positions?.name || null,
      department: u.employee?.department_employee_department_idTodepartment?.name || null,
      telegram_username: u.employee?.telegram_username || null,
      email: u.employee?.email || null,
      name: u.employee?.role?.name || null,
      role_id: u.employee?.role_id || null,
      is_active: u.employee?.is_active || 'inactive',
    }));


    return {
      result: true,
      message: "Get user data successfully.",
      data: result,
      pagination: {
        total,
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
export const updateUser = async (
  telegram_username,
  email,
  role_id,
  user_id,
  company_id
) => {
  try {
    const cid = parseInt(company_id);
    const user = await prisma.user.findUnique({
      where: { 
        id: parseInt(user_id),
        employee: { company_id: cid }
      },
      select: { employee_id: true },
    });

    if (!user || !user.employee_id) {
      return {
        result: false,
        message: "User not found in your company..!",
      };
    }

    await prisma.employee.update({
      where: { id: user.employee_id, company_id: cid },
      data: {
        telegram_username,
        email,
        role_id: parseInt(role_id),
      },
    });

    return {
      result: true,
      message: "User updated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
