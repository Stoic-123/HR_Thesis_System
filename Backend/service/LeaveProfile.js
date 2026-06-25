import prisma from "../lib/prisma.js";

export const CreateLeaveProfile = async (
  employee_id,
  leave_type_id,
  assignment,
  balance,
) => {
  try {
    // Check if leave type is ML and employee is female
    const [employee, leaveType] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: parseInt(employee_id) },
        select: { gender: true },
      }),
      prisma.leavetype.findUnique({
        where: { id: parseInt(leave_type_id) },
        select: { code: true },
      }),
    ]);

    if (leaveType?.code === 'ML' && employee?.gender !== 'female') {
      throw new Error("Maternity Leave is only available for female employees.");
    }

    await prisma.leaveprofile.create({
      data: {
        employee_id,
        leave_type_id,
        assignment,
        balance,
      },
    });
    return {
      result: true,
      message: "Leave Profile Created Successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error.message;
  }
};

export const GetLeaveProfilesByCompany = async (company_id) => {
  try {
    console.log("GetLeaveProfilesByCompany called with company_id:", company_id);
    console.log("Parsed company_id:", parseInt(company_id));
    const leaveProfiles = await prisma.leaveprofile.findMany({
      where: {
        employee: {
          company_id: parseInt(company_id),
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            gender: true,
          },
        },
        leavetype: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
    // Filter out ML profiles for non-female employees
    const filteredLeaveProfiles = leaveProfiles.filter(profile => {
      if (profile.leavetype.code === 'ML' && profile.employee.gender !== 'female') {
        return false;
      }
      return true;
    });
    console.log("Found leaveProfiles:", leaveProfiles);
    console.log("Filtered leaveProfiles:", filteredLeaveProfiles);
    return {
      result: true,
      data: filteredLeaveProfiles,
    };
  } catch (error) {
    console.log("Error in GetLeaveProfilesByCompany:", error.message);
    throw error;
  }
};

export const GetLeaveProfileByEmployee = async (employee_id) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employee_id) },
      select: { gender: true },
    });
    const leaveProfiles = await prisma.leaveprofile.findMany({
      where: {
        employee_id: parseInt(employee_id),
      },
      include: {
        leavetype: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
    // Filter out ML profiles if employee is not female
    const filteredLeaveProfiles = leaveProfiles.filter(profile => {
      if (profile.leavetype.code === 'ML' && employee?.gender !== 'female') {
        return false;
      }
      return true;
    });
    return {
      result: true,
      data: filteredLeaveProfiles,
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const UpdateLeaveProfile = async (id, assignment, balance) => {
  try {
    await prisma.leaveprofile.update({
      where: { id: parseInt(id) },
      data: {
        assignment,
        balance,
      },
    });
    return {
      result: true,
      message: "Leave Profile Updated Successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error.message;
  }
};

export const DeleteLeaveProfile = async (id) => {
  try {
    await prisma.leaveprofile.delete({
      where: { id: parseInt(id) },
    });
    return {
      result: true,
      message: "Leave Profile Deleted Successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

export const syncLeaveProfiles = async (employee_id) => {
  try {
    // Get the employee to check gender
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employee_id) },
      select: { gender: true },
    });

    // Get all leave types
    const leaveTypes = await prisma.leavetype.findMany();

    // For each leave type, check if a profile exists for this employee
    for (const leaveType of leaveTypes) {
      // Skip Maternity Leave (ML) if employee is not female
      if (leaveType.code === 'ML' && employee?.gender !== 'female') {
        continue;
      }

      const existing = await prisma.leaveprofile.findUnique({
        where: {
          employee_id_leave_type_id: {
            employee_id: parseInt(employee_id),
            leave_type_id: leaveType.id,
          },
        },
      });

      if (!existing) {
        // Create new profile with default balance
        await prisma.leaveprofile.create({
          data: {
            employee_id: parseInt(employee_id),
            leave_type_id: leaveType.id,
            assignment: leaveType.default_balance,
            balance: leaveType.default_balance,
          },
        });
      }
    }

    return {
      result: true,
      message: "Leave profiles synced successfully",
    };
  } catch (error) {
    console.error("Error syncing leave profiles:", error);
    throw error;
  }
};

export const getLeaveTypeCode = async (leave_type_id) => {
  try {
    const leaveType = await prisma.leavetype.findUnique({
      where: {
        id: parseInt(leave_type_id),
      },
      select: {
        code: true,
      },
    });
    return leaveType?.code;
  } catch (error) {
    console.log(error.message);
    return null;
  }
};
