import {
  createHoliday,
  deleteHoliday,
  getHoliday,
  updateHoliday,
} from "../model/Holiday.js";

export const createHolidayController = async (req, res) => {
  try {
    const { company_id, name, start_date, end_date } = req.body;
    if (!company_id || !name || !start_date || !end_date) {
      return res
        .status(400)
        .json({ result: false, message: "All field are required..!" });
    }
    const holidayInsertData = await createHoliday(
      company_id,
      name,
      start_date,
      end_date
    );
    res.status(200).json(holidayInsertData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const getHolidayController = async (req, res) => {
  try {
    const { company_id, year } = req.params;
    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company_id is required..!" });
    }
    const holidayGetData = await getHoliday(
      company_id,
      year !== undefined ? year : null
    );
    res.status(200).json(holidayGetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const updateHolidayController = async (req, res) => {
  try {
    const { name, start_date, end_date } = req.body;
    const { holiday_id } = req.params;
    if (!name || !start_date || !end_date || !holiday_id) {
      return res
        .status(400)
        .json({ result: false, message: "All field are required..!" });
    }
    const holidayUpdateData = await updateHoliday(
      name,
      start_date,
      end_date,
      holiday_id
    );
    res.status(200).json(holidayUpdateData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const deleteHolidayController = async (req, res) => {
  try {
    const { holiday_id } = req.params;
    if (!holiday_id) {
      return res
        .status(400)
        .json({ result: false, message: "Holiday_id is required..!" });
    }
    const holidayDeleteData = await deleteHoliday(holiday_id);
    res.status(200).json(holidayDeleteData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
