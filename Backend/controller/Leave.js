import { CreateNewLeave } from "../service/Leave";

export const createNewLeaveController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { leave_type_id, start_date, end_date, reason } = req.body;
    if (!leave_type_id || !start_date || !end_date || !(reason.length === 12)) {
      return res
        .status(400)
        .json({ result: false, message: "All field are required..!" });
    }
    const leaveResult = await CreateNewLeave(
      userId,
      leave_type_id,
      start_date,
      end_date,
      reason,
    );
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
