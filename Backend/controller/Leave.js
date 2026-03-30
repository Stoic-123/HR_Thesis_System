import { CreateNewLeave } from "../service/Leave.js";
import { getLeaveTypeCode } from "../service/LeaveProfile.js";

export const createNewLeaveController = async (req, res) => {
  try {
    const userId = req.user.id;
    let photo_path = "";
    if (req.files || req.files.photo_path) {
      const photo = req.files.photo_path;
      const photoName = Date.now() + "_" + photo.name;
      const photoPath = "/uploads/leaves/" + photoName;
      await photo.mv(photoPath);
      photo_path = "/uploads/leaves/" + photoName;
    }
    const { leave_type_id, start_date, end_date, reason } = req.body;
    if (!leave_type_id || !start_date || !end_date || !(reason.length === 12)) {
      return res
        .status(400)
        .json({ result: false, message: "All field are required..!" });
    }

    const leave_type_code = getLeaveTypeCode(leave_type_id);
    if (leave_type_code === "SL" || leave_type_code === "ML") {
      if (!photo_path) {
        return res.status(400).json({
          result: false,
          message: "Photo reference is required for Sick Leave Or ML..!",
        });
      }
      return;
    }
    const leaveResult = await CreateNewLeave(
      userId,
      leave_type_id,
      start_date,
      end_date,
      reason,
    );
    res.status(200).json(leaveResult);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
