import prisma from "../lib/prisma.js";

export const createEmployeeWorkingProfile = async (employee_id, day_of_week_id, allow_online_bypass_location = false) => {
  try {
    // Check if profile already exists for this employee
    const existing = await prisma.employeeworkingprofile.findUnique({
      where: { employee_id: parseInt(employee_id) },
    });

    if (existing) {
      // Update existing
      await prisma.employeeworkingprofile.update({
        where: { id: existing.id },
        data: {
          day_of_week_id: parseInt(day_of_week_id),
          allow_online_bypass_location: Boolean(allow_online_bypass_location),
        },
      });

      return {
        result: true,
        message: "EmployeeWorkingProfile updated successfully.",
      };
    } else {
      // Create new
      await prisma.employeeworkingprofile.create({
        data: {
          employee_id: parseInt(employee_id),
          day_of_week_id: parseInt(day_of_week_id),
          allow_online_bypass_location: Boolean(allow_online_bypass_location),
        },
      });

      return {
        result: true,
        message: "EmployeeWorkingProfile created successfully.",
      };
    }
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const getEmployeeWorkingProfiles = async (company_id, page = 1, limit = 10) => {
  try {
    const where = {
      employee: {
        company_id: parseInt(company_id),
      },
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
      prisma.employeeworkingprofile.findMany({
        where,
        include: {
          employee: true,
          dayofweek: {
            include: {
              monday: true,
              tuesday: true,
              wednesday: true,
              thursday: true,
              friday: true,
              saturday: true,
              sunday: true,
            },
          },
        },
        skip,
        take,
      }),
      prisma.employeeworkingprofile.count({
        where,
      }),
    ]);

    return {
      result: true,
      message: "Get EmployeeWorkingProfile data successfully.",
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

export const getEmployeeWorkingProfileByEmployeeId = async (employee_id) => {
  try {
    const data = await prisma.employeeworkingprofile.findUnique({
      where: { employee_id: parseInt(employee_id) },
      include: {
        employee: true,
        dayofweek: {
          include: {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: true,
            sunday: true,
          },
        },
      },
    });

    if (!data) {
      return {
        result: false,
        message: "EmployeeWorkingProfile not found..!",
      };
    }

    return {
      result: true,
      message: "Get EmployeeWorkingProfile data successfully.",
      data,
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const deleteEmployeeWorkingProfile = async (id) => {
  try {
    await prisma.employeeworkingprofile.delete({
      where: { id: parseInt(id) },
    });

    return {
      result: true,
      message: "EmployeeWorkingProfile deleted successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};
