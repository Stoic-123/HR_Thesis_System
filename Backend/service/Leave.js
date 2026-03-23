import prisma from "../lib/prisma.js";

export const CreateNewLeave = async (
  employee_id,
  leave_type_id,
  start_date,
  end_date,
  reason,
) => {
  try {
    await prisma.leaverecord.create({
      data: {
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        reason,
      },
    });
    return {
      result: true,
      message: "Request Leave Successfully.",
    };
  } catch (error) {
    console.log(error.message);
    throw error.message;
  }
};
