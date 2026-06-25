import {
  createDayOfWeek,
  getDayOfWeeks,
  getDayOfWeekById,
  updateDayOfWeek,
  deleteDayOfWeek,
} from "../service/DayOfWeek.js";

export const createDayOfWeekController = async (req, res) => {
  try {
    const {
      name,
      code, is_default,
      monday_id, tuesday_id, wednesday_id, thursday_id,
      friday_id, saturday_id, sunday_id
    } = req.body;
    const company_id = req.user.company_id;

    if (!name || !code || !company_id) {
      return res.status(400).json({
        result: false,
        message: "Name, code, and company context are required..!",
      });
    }

    const dayOfWeekData = await createDayOfWeek(
      name, code, company_id, is_default,
      monday_id, tuesday_id, wednesday_id, thursday_id,
      friday_id, saturday_id, sunday_id
    );
    res.status(200).json(dayOfWeekData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getDayOfWeeksController = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { page, limit } = req.query;

    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company context is required..!" });
    }

    const dayOfWeekData = await getDayOfWeeks(company_id, page, limit);
    res.status(200).json(dayOfWeekData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getDayOfWeekByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        result: false,
        message: "ID is required..!",
      });
    }

    const dayOfWeekData = await getDayOfWeekById(id);
    res.status(200).json(dayOfWeekData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const updateDayOfWeekController = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      is_default,
      monday_id,
      tuesday_id,
      wednesday_id,
      thursday_id,
      friday_id,
      saturday_id,
      sunday_id,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        result: false,
        message: "ID is required..!",
      });
    }

    const dayOfWeekData = await updateDayOfWeek(
      id,
      name,
      code,
      is_default,
      monday_id,
      tuesday_id,
      wednesday_id,
      thursday_id,
      friday_id,
      saturday_id,
      sunday_id,
    );
    res.status(200).json(dayOfWeekData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const deleteDayOfWeekController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        result: false,
        message: "ID is required..!",
      });
    }

    const dayOfWeekData = await deleteDayOfWeek(id);
    res.status(200).json(dayOfWeekData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
