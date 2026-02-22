import { createTimeMode, getTimeMode } from "../service/TimeMode.js";

export const createTimeModeController = async (req, res) => {
  try {
    const { name, remark } = req.body;
    const company_id = req.user.company_id;
    if (!name || !company_id) {
      return res.status(400).json({
        result: false,
        message: "Name and company context are required..!",
      });
    }
    const timemodeInsertData = await createTimeMode(name, company_id, remark);
    res.status(200).json(timemodeInsertData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const getTimeModeController = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company context is required..!" });
    }
    const timeModeGetData = await getTimeMode(company_id);
    res.status(200).json(timeModeGetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
