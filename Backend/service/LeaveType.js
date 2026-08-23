import prisma from "../lib/prisma.js";

export const createLeaveType = async (
  name,
  code,
  default_balance,
  company_id,
) => {
  try {
    const newLt = await prisma.leavetype.create({
      data: {
        name,
        code,
        default_balance: parseInt(default_balance),
        company_id: parseInt(company_id),
      },
    });

    // Automatically create leave profiles for all active employees in the company
    try {
      const activeEmployees = await prisma.employee.findMany({
        where: { company_id: parseInt(company_id), is_active: "active" },
        select: { id: true, gender: true },
      });
      for (const emp of activeEmployees) {
        if (code === "ML" && emp.gender !== "female") continue;
        await prisma.leaveprofile.create({
          data: {
            employee_id: emp.id,
            leave_type_id: newLt.id,
            assignment: parseInt(default_balance) || 0,
            balance: parseInt(default_balance) || 0,
            used: 0,
          },
        });
      }
    } catch (err) {
      console.error("Auto-sync new leave type to employees error:", err.message);
    }

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
        message: `Cannot delete this Leave Type because ${recordCount} leave request record(s) are already using it.`,
      };
    }

    // 2. Check if any employee has used leave days under this type
    const usedProfiles = await prisma.leaveprofile.count({
      where: {
        leave_type_id: leaveTypeId,
        used: { gt: 0 },
      },
    });
    if (usedProfiles > 0) {
      return {
        result: false,
        message: `Cannot delete this Leave Type because employees have recorded leave days used under it.`,
      };
    }

    // 3. Remove unused employee leave profile placeholders for this leave type
    await prisma.leaveprofile.deleteMany({
      where: { leave_type_id: leaveTypeId },
    });

    // 4. Delete the leave type
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
