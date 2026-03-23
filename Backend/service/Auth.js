import prisma from "../lib/prisma.js";

export const employeeChecker = async (username) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return {
        result: false,
        message: "This username not found on the system..!",
      };
    }

    return user;
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};
export const getCompanyID = async (employee_id) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employee_id },
      select: {
        company_id: true,
      },
    });

    if (!employee) {
      return {
        result: false,
        message: "This employee not found in the system..!",
      };
    }

    return employee.company_id;
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};
export const InvalidateToken = async (user_id) => {
  try {
    await prisma.user.update({
      where: { id: user_id },
      data: {
        token_version: {
          increment: 1,
        },
      },
    });

    return {
      result: true,
      message: "Invalidate token successfully..!",
    };
  } catch (error) {
    console.error(error.message);
    throw error;
  }
};
