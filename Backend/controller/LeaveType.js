import {
  createLeaveType,
  deleteLeaveType,
  getLeaveType,
  updateLeaveType,
} from "../service/LeaveType.js";

export const createLeaveTypeController = async (req, res) => {
  try {
    const { name, code, default_balance } = req.body;
    const company_id = req.user.company_id;
    if (!name || !company_id) {
      return res.status(400).json({
        result: false,
        message: "Name and company context are required..!",
      });
    }
    const leaveTypeInsertData = await createLeaveType(
      name,
      code,
      default_balance,
      company_id,
    );
    res.status(200).json(leaveTypeInsertData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const getLeaveTypeController = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { page, limit } = req.query;
    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company context is required..!" });
    }
    const leaveTypeGetData = await getLeaveType(company_id, page, limit);
    res.status(200).json(leaveTypeGetData);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const updateLeaveTypeController = async (req, res) => {
  try {
    const { id } = req.params;
    const {name,code,default_balance} = req.body;
    if (!id) {
      return res
        .status(400)
        .json({ result: false, message: "Id is required..!" });
    }
    const leaveTypeUpdateData = await updateLeaveType(name,code,default_balance,id);
    res.status(200).json(leaveTypeUpdateData);
  } catch (error) {
    console.error({ result: false, message: error.message });
    res.status(500).json({ result: false, message: error.message });
  }
};
export const deleteLeaveTypeController = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ result: false, message: "Id is required..!" });
    }
    const leaveTypeDeleteData = await deleteLeaveType(id);
    res.status(200).json(leaveTypeDeleteData);
  } catch (error) {
    console.error({ result: false, message: error.message });
    res.status(500).json({ result: false, message: error.message });
  }
};
