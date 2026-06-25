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
export const getTimeMode = async (company_id, page = 1, limit = 10) => {
  try {
    const where = {
      company_id: parseInt(company_id),
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
      prisma.timemode.findMany({
        where,
        skip,
        take,
      }),
      prisma.timemode.count({
        where,
      }),
    ]);

    if (data.length === 0) {
      return {
        result: false,
        message: "No timemode data in database..!",
      };
    }
    return {
      result: true,
      message: "Get timemode data successfully.",
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

export const updateTimeMode = async (id, name, company_id, remark) => {
  try {
    const updated = await prisma.timemode.update({
      where: {
        id: parseInt(id),
        company_id: parseInt(company_id),
      },
      data: {
        name,
        remark,
      },
    });

    return {
      result: true,
      message: "Timemode updated successfully.",
      data: updated,
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const deleteTimeMode = async (id, company_id) => {
  try {
    await prisma.timemode.delete({
      where: {
        id: parseInt(id),
        company_id: parseInt(company_id),
      },
    });

    return {
      result: true,
      message: "Timemode deleted successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
