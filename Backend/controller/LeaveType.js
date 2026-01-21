import { createLeaveType } from "../model/LeaveType.js";

export const createLeaveTypeController = async (req, res) => {
  try {
    const { name, company_id } = req.body;
    if (!name || !company_id) {
      return res.status(400).json({
        result: false,
        message: "Name and company_id are required..!",
      });
    }
    const leaveTypeInsertData = await createLeaveType(name, company_id);
    res.status(200).json(leaveTypeInsertData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
