import { createTimeMode, getTimeMode, updateTimeMode, deleteTimeMode } from "../service/TimeMode.js";

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
    const { page, limit } = req.query;
    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company context is required..!" });
    }
    const timeModeGetData = await getTimeMode(company_id, page, limit);
    res.status(200).json(timeModeGetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const updateTimeModeController = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, remark } = req.body;
    const company_id = req.user.company_id;

    if (!id || !name || !company_id) {
      return res.status(400).json({
        result: false,
        message: "ID, Name, and company context are required.",
      });
    }

    const result = await updateTimeMode(id, name, company_id, remark);
    res.status(200).json(result);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const deleteTimeModeController = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.company_id;

    if (!id || !company_id) {
      return res.status(400).json({
        result: false,
        message: "ID and company context are required.",
      });
    }

    const result = await deleteTimeMode(id, company_id);
    res.status(200).json(result);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
