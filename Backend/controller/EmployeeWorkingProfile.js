import {
  createEmployeeWorkingProfile,
  getEmployeeWorkingProfiles,
  getEmployeeWorkingProfileByEmployeeId,
  deleteEmployeeWorkingProfile,
} from "../service/EmployeeWorkingProfile.js";

export const createEmployeeWorkingProfileController = async (req, res) => {
  try {
    const { employee_id, day_of_week_id, allow_online_bypass_location } = req.body;

    if (!employee_id || !day_of_week_id) {
      return res.status(400).json({
        result: false,
        message: "Employee ID and DayOfWeek ID are required..!",
      });
    }

    const bypassLocation =
      allow_online_bypass_location === true ||
      allow_online_bypass_location === 'true' ||
      allow_online_bypass_location === 1;

    const data = await createEmployeeWorkingProfile(employee_id, day_of_week_id, bypassLocation);
    res.status(200).json(data);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getEmployeeWorkingProfilesController = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { page, limit } = req.query;

    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company context is required..!" });
    }

    const data = await getEmployeeWorkingProfiles(company_id, page, limit);
    res.status(200).json(data);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getEmployeeWorkingProfileByEmployeeIdController = async (req, res) => {
  try {
    const { employee_id } = req.params;

    if (!employee_id) {
      return res.status(400).json({
        result: false,
        message: "Employee ID is required..!",
      });
    }

    const data = await getEmployeeWorkingProfileByEmployeeId(employee_id);
    res.status(200).json(data);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const deleteEmployeeWorkingProfileController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        result: false,
        message: "ID is required..!",
      });
    }

    const data = await deleteEmployeeWorkingProfile(id);
    res.status(200).json(data);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
