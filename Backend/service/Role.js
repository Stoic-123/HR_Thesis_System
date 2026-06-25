import prisma from "../lib/prisma.js";

export const addRole = async (name, company_id) => {
  try {
    await prisma.role.create({
      data: {
        name,
        company_id: parseInt(company_id),
      },
    });

    return {
      result: true,
      message: "Role created successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const getRole = async (company_id, page = 1, limit = 10) => {
  try {
    const where = {
      company_id: parseInt(company_id),
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
      prisma.role.findMany({
        where,
        skip,
        take,
        include: {
          rolebaseaccess: true,
        },
      }),
      prisma.role.count({
        where,
      }),
    ]);

    if (data.length === 0) {
      return {
        result: false,
        message: "No role data in database..!",
      };
    }
    return {
      result: true,
      message: "Get role data successfully.",
      data,
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
export const updateRole = async (name, role_id, company_id) => {
  try {
    await prisma.role.update({
      where: {
        id: parseInt(role_id),
        company_id: parseInt(company_id),
      },
      data: { name },
    });

    return {
      result: true,
      message: "Role updated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const updateRolePermissions = async (role_id, permissions, company_id) => {
  try {
    const role = await prisma.role.findFirst({
      where: {
        id: parseInt(role_id),
        company_id: parseInt(company_id),
      },
    });

    if (!role) {
      return {
        result: false,
        message: "Role not found or access denied.",
      };
    }

    await prisma.$transaction([
      prisma.rolebaseaccess.deleteMany({
        where: {
          role_id: parseInt(role_id),
        },
      }),
      prisma.rolebaseaccess.createMany({
        data: permissions.map((p) => ({
          path: p.path,
          path_name: p.path_name || p.path,
          role_id: parseInt(role_id),
        })),
      }),
    ]);

    return {
      result: true,
      message: "Role permissions updated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

