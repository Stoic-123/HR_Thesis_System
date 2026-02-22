import prisma from "../lib/prisma.js";
export const addDepartment = async (name, manager_id = null, company_id) => {
  try {
    await prisma.department.create({
      data: {
        name,
        manager_id: manager_id ? parseInt(manager_id) : null,
        company_id: parseInt(company_id),
      },
    });

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
    const where = {
      company_id: parseInt(company_id),
    };

    if (is_active !== null && is_active !== undefined) {
      where.is_active = is_active === 1 || is_active === "1" || is_active === true;
    }

    const departmentResult = await prisma.department.findMany({
      where,
    });

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
    await prisma.department.update({
      where: {
        id: parseInt(department_id),
        company_id: parseInt(company_id),
      },
      data: {
        name,
        manager_id: manager_id ? parseInt(manager_id) : null,
      },
    });

    return {
      result: true,
      message: "Department updated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const deactivatedDepartment = async (department_id, company_id) => {
  try {
    const id = parseInt(department_id);
    const cid = parseInt(company_id);
    await prisma.$transaction([
      prisma.department.update({
        where: { id, company_id: cid },
        data: { is_active: false },
      }),
      prisma.employee.updateMany({
        where: { department_id: id, company_id: cid },
        data: { department_id: null, position_id: null },
      }),
      prisma.positions.updateMany({
        where: { department_id: id, department: { company_id: cid } },
        data: { is_active: false },
      }),
    ]);

    return {
      result: true,
      message: "Department deactivated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const activatedDepartment = async (department_id, company_id) => {
  try {
    const id = parseInt(department_id);
    const cid = parseInt(company_id);
    await prisma.$transaction([
      prisma.department.update({
        where: { id, company_id: cid },
        data: { is_active: true },
      }),
      prisma.positions.updateMany({
        where: { department_id: id, department: { company_id: cid } },
        data: { is_active: true },
      }),
    ]);

    return {
      result: true,
      message: "Department activated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
