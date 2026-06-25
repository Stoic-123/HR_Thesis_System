import prisma from "../lib/prisma.js";

export const createDayOfWeek = async (
  name,
  code,
  company_id,
  is_default = false,
  monday_id,
  tuesday_id,
  wednesday_id,
  thursday_id,
  friday_id,
  saturday_id,
  sunday_id
) => {
  try {
    await prisma.dayofweek.create({
      data: {
        name,
        code,
        company_id: parseInt(company_id),
        is_default,
        monday_id: monday_id ? parseInt(monday_id) : null,
        tuesday_id: tuesday_id ? parseInt(tuesday_id) : null,
        wednesday_id: wednesday_id ? parseInt(wednesday_id) : null,
        thursday_id: thursday_id ? parseInt(thursday_id) : null,
        friday_id: friday_id ? parseInt(friday_id) : null,
        saturday_id: saturday_id ? parseInt(saturday_id) : null,
        sunday_id: sunday_id ? parseInt(sunday_id) : null,
      },
    });

    return {
      result: true,
      message: "DayOfWeek created successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const getDayOfWeeks = async (company_id, page = 1, limit = 10) => {
  try {
    const where = {
      company_id: parseInt(company_id),
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
      prisma.dayofweek.findMany({
        where,
        include: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true,
        },
        skip,
        take,
      }),
      prisma.dayofweek.count({
        where,
      }),
    ]);

    if (data.length === 0) {
      return {
        result: false,
        message: "No DayOfWeek data in database..!",
      };
    }

    return {
      result: true,
      message: "Get DayOfWeek data successfully.",
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

export const getDayOfWeekById = async (id) => {
  try {
    const data = await prisma.dayofweek.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
      },
    });

    if (!data) {
      return {
        result: false,
        message: "DayOfWeek not found..!",
      };
    }

    return {
      result: true,
      message: "Get DayOfWeek data successfully.",
      data,
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const updateDayOfWeek = async (
  id,
  name,
  code,
  is_default,
  monday_id,
  tuesday_id,
  wednesday_id,
  thursday_id,
  friday_id,
  saturday_id,
  sunday_id
) => {
  try {
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (is_default !== undefined) updateData.is_default = is_default;
    if (monday_id !== undefined) updateData.monday_id = monday_id ? parseInt(monday_id) : null;
    if (tuesday_id !== undefined) updateData.tuesday_id = tuesday_id ? parseInt(tuesday_id) : null;
    if (wednesday_id !== undefined) updateData.wednesday_id = wednesday_id ? parseInt(wednesday_id) : null;
    if (thursday_id !== undefined) updateData.thursday_id = thursday_id ? parseInt(thursday_id) : null;
    if (friday_id !== undefined) updateData.friday_id = friday_id ? parseInt(friday_id) : null;
    if (saturday_id !== undefined) updateData.saturday_id = saturday_id ? parseInt(saturday_id) : null;
    if (sunday_id !== undefined) updateData.sunday_id = sunday_id ? parseInt(sunday_id) : null;

    await prisma.dayofweek.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return {
      result: true,
      message: "DayOfWeek updated successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const deleteDayOfWeek = async (id) => {
  try {
    await prisma.dayofweek.delete({
      where: { id: parseInt(id) },
    });

    return {
      result: true,
      message: "DayOfWeek deleted successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
