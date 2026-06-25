import {
  CreateLeaveProfile,
  GetLeaveProfilesByCompany,
  GetLeaveProfileByEmployee,
  UpdateLeaveProfile,
  DeleteLeaveProfile,
  syncLeaveProfiles,
} from "../service/LeaveProfile.js";
import { addAuditLog } from "../service/AuditLog.js";

export const createLeaveProfileController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { employee_id, leave_type_id, assignment, balance } = req.body;
    if (!employee_id || !leave_type_id || assignment === undefined) {
      return res
        .status(400)
        .json({ result: false, message: "Missing required fields" });
    }

    const result = await CreateLeaveProfile(
      employee_id,
      leave_type_id,
      assignment,
      balance !== undefined ? balance : assignment,
    );

    await addAuditLog(
      userId,
      req.user.company_id,
      "Leave Profile",
      "CREATE",
      "Created leave profile",
      null,
      req.ip,
      req.headers["user-agent"],
    );

    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error });
  }
};

export const getLeaveProfilesController = async (req, res) => {
  try {
    console.log("getLeaveProfilesController called, user:", req.user);
    const company_id = req.user.company_id;
    console.log("Company ID:", company_id);
    const result = await GetLeaveProfilesByCompany(company_id);
    console.log("Fetched leave profiles:", result);
    res.status(200).json(result);
  } catch (error) {
    console.log("Error in getLeaveProfilesController:", error);
    res.status(500).json({ result: false, message: error });
  }
};

export const getEmployeeLeaveProfileController = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const result = await GetLeaveProfileByEmployee(employee_id);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error });
  }
};

export const updateLeaveProfileController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { assignment, balance } = req.body;

    if (assignment === undefined) {
      return res
        .status(400)
        .json({ result: false, message: "Assignment is required" });
    }

    const result = await UpdateLeaveProfile(
      id,
      assignment,
      balance !== undefined ? balance : assignment,
    );

    await addAuditLog(
      userId,
      req.user.company_id,
      "Leave Profile",
      "UPDATE",
      "Updated leave profile",
      null,
      req.ip,
      req.headers["user-agent"],
    );

    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error });
  }
};

export const deleteLeaveProfileController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await DeleteLeaveProfile(id);

    await addAuditLog(
      userId,
      req.user.company_id,
      "Leave Profile",
      "DELETE",
      "Deleted leave profile",
      null,
      req.ip,
      req.headers["user-agent"],
    );

    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error });
  }
};

export const syncLeaveProfilesController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { employee_id } = req.body;

    const result = await syncLeaveProfiles(employee_id);

    await addAuditLog(
      userId,
      req.user.company_id,
      "Leave Profile",
      "SYNC",
      "Synced leave profiles for employee",
      null,
      req.ip,
      req.headers["user-agent"],
    );

    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ result: false, message: error });
  }
};
