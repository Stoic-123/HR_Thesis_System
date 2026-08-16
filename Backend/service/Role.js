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
    const existing = await prisma.role.findFirst({
      where: {
        id: parseInt(role_id),
        company_id: parseInt(company_id),
      },
    });

    if (existing && existing.name.toLowerCase() === "admin" && name.trim().toLowerCase() !== "admin") {
      return {
        result: false,
        message: "The core system Admin role name cannot be renamed.",
      };
    }

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

    let finalPermissions = [...permissions];

    // Core security protection: Admin role MUST ALWAYS have web login and role management
    if (role.name.toLowerCase() === "admin") {
      const requiredAdminPerms = [
        { path: "app:web_login", path_name: "Web Dashboard Access" },
        { path: "role:manage", path_name: "Manage Roles & Permissions" },
      ];

      for (const req of requiredAdminPerms) {
        if (!finalPermissions.some((p) => p.path === req.path)) {
          finalPermissions.push(req);
        }
      }
    }

    await prisma.$transaction([
      prisma.rolebaseaccess.deleteMany({
        where: {
          role_id: parseInt(role_id),
        },
      }),
      prisma.rolebaseaccess.createMany({
        data: finalPermissions.map((p) => ({
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

export const deleteRole = async (role_id, company_id) => {
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

    // 1. Cannot delete system core Admin role
    if (role.name.toLowerCase() === "admin") {
      return {
        result: false,
        message: "The core system Admin role cannot be deleted.",
      };
    }

    // 2. Check if any employee is currently assigned this role
    const employeeCount = await prisma.employee.count({
      where: {
        role_id: parseInt(role_id),
        company_id: parseInt(company_id),
      },
    });

    if (employeeCount > 0) {
      return {
        result: false,
        message: `Cannot delete this role because ${employeeCount} employee(s) are currently assigned to it. Please reassign those employees first.`,
      };
    }

    // 3. Delete role permissions and role in a transaction
    await prisma.$transaction([
      prisma.rolebaseaccess.deleteMany({
        where: {
          role_id: parseInt(role_id),
        },
      }),
      prisma.role.delete({
        where: {
          id: parseInt(role_id),
        },
      }),
    ]);

    return {
      result: true,
      message: "Role deleted successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

