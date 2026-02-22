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
export const getRole = async (company_id) => {
  try {
    const roleData = await prisma.role.findMany({
      where: {
        company_id: parseInt(company_id),
      },
    });

    if (roleData.length === 0) {
      return {
        result: false,
        message: "No role data in database..!",
      };
    }
    return {
      result: true,
      message: "Get role data successfully.",
      data: roleData,
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
