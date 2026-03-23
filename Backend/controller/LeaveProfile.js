import { CreateLeaveProfile } from "../service/LeaveProfile";

const leaveTypeBalance = {
  AL: 18,
  SPL: 7,
  SL: 7,
  MTL: 90,
};

export const createLeaveProfileController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { leave_type_id, assignment, balance } = req.body;
    if (!leave_type_id || !assignment) {
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
