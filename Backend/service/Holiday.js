import prisma from "../lib/prisma.js";

export const createHoliday = async (company_id, name, start_date, end_date) => {
  try {
    await prisma.holiday.create({
      data: {
        company_id: parseInt(company_id),
        name,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
      },
    });

    return {
      result: true,
      message: "Holiday created successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const getHoliday = async (company_id, year = null) => {
  try {
    const where = {
      company_id: parseInt(company_id),
    };

    if (year !== null && year !== undefined) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
      
      where.OR = [
        { start_date: { gte: startOfYear, lte: endOfYear } },
        { end_date: { gte: startOfYear, lte: endOfYear } },
      ];
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: {
        start_date: "asc",
      },
    });

    return {
      result: true,
      data: holidays,
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const deleteHoliday = async (holiday_id, company_id) => {
  try {
    await prisma.holiday.delete({
      where: {
        id: parseInt(holiday_id),
        company_id: parseInt(company_id),
      },
    });

    return {
      result: true,
      message: "Holiday deleted successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
export const updateHoliday = async (
  name,
  start_date,
  end_date,
  holiday_id,
  company_id
) => {
  try {
    await prisma.holiday.update({
      where: {
        id: parseInt(holiday_id),
        company_id: parseInt(company_id),
      },
      data: {
        name,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
      },
    });

    return {
      result: true,
      message: "Holiday updated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
