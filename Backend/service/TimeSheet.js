import prisma from "../lib/prisma.js";

export const createTimeSheet = async (
  name,
  code,
  company_id,
  time_in,
  lunch_out,
  lunch_in,
  time_out,
  require_time_in = true,
  require_lunch_out = false,
  require_lunch_in = false,
  require_time_out = true
) => {
  try {
    await prisma.timesheet.create({
      data: {
        name,
        code,
        company_id: parseInt(company_id),
        time_in,
        lunch_out,
        lunch_in,
        time_out,
        require_time_in,
        require_lunch_out,
        require_lunch_in,
        require_time_out,
      },
    });

    return {
      result: true,
      message: "TimeSheet created successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const getTimeSheets = async (company_id, page = 1, limit = 10) => {
  try {
    const where = {
      company_id: parseInt(company_id),
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
      prisma.timesheet.findMany({
        where,
        skip,
        take,
      }),
      prisma.timesheet.count({
        where,
      }),
    ]);

    if (data.length === 0) {
      return {
        result: false,
        message: "No TimeSheet data in database..!",
      };
    }

    return {
      result: true,
      message: "Get TimeSheet data successfully.",
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

export const getTimeSheetById = async (id) => {
  try {
    const data = await prisma.timesheet.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    if (!data) {
      return {
        result: false,
        message: "TimeSheet not found..!",
      };
    }

    return {
      result: true,
      message: "Get TimeSheet data successfully.",
      data,
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const updateTimeSheet = async (
  id,
  name,
  code,
  time_in,
  lunch_out,
  lunch_in,
  time_out,
  require_time_in,
  require_lunch_out,
  require_lunch_in,
  require_time_out
) => {
  try {
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (time_in !== undefined) updateData.time_in = time_in;
    if (lunch_out !== undefined) updateData.lunch_out = lunch_out;
    if (lunch_in !== undefined) updateData.lunch_in = lunch_in;
    if (time_out !== undefined) updateData.time_out = time_out;
    if (require_time_in !== undefined) updateData.require_time_in = require_time_in;
    if (require_lunch_out !== undefined) updateData.require_lunch_out = require_lunch_out;
    if (require_lunch_in !== undefined) updateData.require_lunch_in = require_lunch_in;
    if (require_time_out !== undefined) updateData.require_time_out = require_time_out;

    await prisma.timesheet.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return {
      result: true,
      message: "TimeSheet updated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const deleteTimeSheet = async (id) => {
  try {
    await prisma.timesheet.delete({
      where: { id: parseInt(id) },
    });

    return {
      result: true,
      message: "TimeSheet deleted successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
