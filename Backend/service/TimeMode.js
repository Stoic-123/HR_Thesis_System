import prisma from "../lib/prisma.js";

export const createTimeMode = async (name, company_id, remark) => {
  try {
    await prisma.timemode.create({
      data: {
        name,
        company_id: parseInt(company_id),
        remark,
      },
    });

    return {
      result: true,
      message: "Timemode created successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const getTimeMode = async (company_id) => {
  try {
    const timeModeData = await prisma.timemode.findMany({
      where: {
        company_id: parseInt(company_id),
      },
    });

    if (timeModeData.length === 0) {
      return {
        result: false,
        message: "No timemode data in database..!",
      };
    }
    return {
      result: true,
      message: "Get timemode data successfully.",
      data: timeModeData,
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
