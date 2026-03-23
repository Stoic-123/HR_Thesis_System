import prisma from "../lib/prisma.js";

export const CreateLeaveProfile = async (
  employee_id,
  leave_type_id,
  assignment,
  balance,
) => {
  try {
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

export const getLeaveTypeCode = async (leave_type_id) => {
  try {
    await prisma.leavetype.findUnique({
      where: {
        leave_type_id: parseInt(leave_type_id),
      },
    });
  } catch (error) {
    console.log(error.message);
  }
};
