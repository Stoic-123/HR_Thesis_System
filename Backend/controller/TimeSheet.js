import {
  createTimeSheet,
  getTimeSheets,
  getTimeSheetById,
  updateTimeSheet,
  deleteTimeSheet,
} from "../service/TimeSheet.js";

export const createTimeSheetController = async (req, res) => {
  try {
    const {
      name,
      code,
      time_in,
      lunch_out,
      lunch_in,
      time_out,
      require_time_in,
      require_lunch_out,
      require_lunch_in,
      require_time_out,
    } = req.body;
    const company_id = req.user.company_id;

    if (!name || !code || !company_id) {
      return res.status(400).json({
        result: false,
        message: "Name, code, and company context are required..!",
      });
    }

    const timeSheetData = await createTimeSheet(
      name,
      code,
      company_id,
      time_in,
      lunch_out,
      lunch_in,
      time_out,
      require_time_in,
      require_lunch_out,
      require_lunch_in,
      require_time_out
    );
    res.status(200).json(timeSheetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getTimeSheetsController = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { page, limit } = req.query;

    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company context is required..!" });
    }

    const timeSheetData = await getTimeSheets(company_id, page, limit);
    res.status(200).json(timeSheetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getTimeSheetByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        result: false,
        message: "ID is required..!",
      });
    }

    const timeSheetData = await getTimeSheetById(id);
    res.status(200).json(timeSheetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const updateTimeSheetController = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      time_in,
      lunch_out,
      lunch_in,
      time_out,
      require_time_in,
      require_lunch_out,
      require_lunch_in,
      require_time_out,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        result: false,
        message: "ID is required..!",
      });
    }

    const timeSheetData = await updateTimeSheet(
      id,
      name,
      code,
      time_in,
      lunch_out,
      lunch_in,
      time_out,
      require_time_in,
      require_lunch_out,
      require_lunch_in,
      require_time_out
    );
    res.status(200).json(timeSheetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const deleteTimeSheetController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        result: false,
        message: "ID is required..!",
      });
    }

    const timeSheetData = await deleteTimeSheet(id);
    res.status(200).json(timeSheetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
