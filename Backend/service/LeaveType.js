import prisma from "../lib/prisma.js";

export const createLeaveType = async (
  name,
  code,
  default_balance,
  company_id,
) => {
  try {
    await prisma.leavetype.create({
      data: {
        name,
        code,
        default_balance: parseInt(default_balance),
        company_id: parseInt(company_id),
      },
    });

    return {
      result: true,
      message: "Leavetype created successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const getLeaveType = async (company_id) => {
  try {
    const leaveType = await prisma.leavetype.findMany({
      where: {
        company_id: parseInt(company_id),
      },
    });
    if (leaveType.length === 0) {
      return {
        result: false,
        message: "No leavetype data in database..!",
      };
    }
    return {
      result: true,
      message: "Get leavetype data successfully.",
      data: leaveType,
    };
  } catch (error) {
    console.error({ result: false, message: error.message });
    throw error;
  }
};
export const updateLeaveType = async (name,code,default_balance,id) => {
  try {
    await prisma.leavetype.update({
      where: {
        id: parseInt(id),
      },
      data:{
        name:name,
        code:code,
        default_balance: parseInt(default_balance)
      }
    });
    return {
      result: true,
      message: "Leave Type updated successfully.",
    };
  } catch (error) {
    console.error({ result: false, message: error.message });
    throw error;
  }
};
export const deleteLeaveType = async (id) => {
  try {
    await prisma.leavetype.delete({
      where: {
        id: parseInt(id),
      },
    });
    return {
      result: true,
      message: "Leave Type deleted successfully.",
    };
  } catch (error) {
    console.error({ result: false, message: error.message });
    throw error;
  }
};
