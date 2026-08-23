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
export const getLeaveType = async (company_id, page = 1, limit = 10) => {
  try {
    const where = {
      company_id: parseInt(company_id),
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
      prisma.leavetype.findMany({
        where,
        skip,
        take,
      }),
      prisma.leavetype.count({
        where,
      }),
    ]);

    if (data.length === 0) {
      return {
        result: false,
        message: "No leavetype data in database..!",
      };
    }
    return {
      result: true,
      message: "Get leavetype data successfully.",
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
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
    const leaveTypeId = parseInt(id);

    // 1. Check if any leave records (requests) are using this leave type
    const recordCount = await prisma.leaverecord.count({
      where: { leave_type_id: leaveTypeId },
    });
    if (recordCount > 0) {
      return {
        result: false,
        message: `Cannot delete this Leave Type because ${recordCount} leave request record(s) are using it.`,
      };
    }

    // 2. Check if any employee leave profile balance is using this leave type
    const profileCount = await prisma.leaveprofile.count({
      where: { leave_type_id: leaveTypeId },
    });
    if (profileCount > 0) {
      return {
        result: false,
        message: `Cannot delete this Leave Type because ${profileCount} employee leave balance profile(s) are assigned to it.`,
      };
    }

    await prisma.leavetype.delete({
      where: {
        id: leaveTypeId,
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
