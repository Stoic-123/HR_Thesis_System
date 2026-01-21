import { db } from "../config/db.js";

export const createLeaveType = async (name, company_id) => {
  try {
    const sql = "INSERT INTO leavetype (name,company_id) VALUES(?,?)";
    const [leaveTypeResult] = await db.execute(sql, [name, company_id]);
    if (leaveTypeResult.affectedRows === 0) {
      return {
        result: false,
        message: "Failed to create leavetype..!",
      };
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
