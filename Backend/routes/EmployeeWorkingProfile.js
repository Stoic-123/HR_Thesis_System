import express from "express";
import {
  createEmployeeWorkingProfileController,
  getEmployeeWorkingProfilesController,
  getEmployeeWorkingProfileByEmployeeIdController,
  deleteEmployeeWorkingProfileController,
} from "../controller/EmployeeWorkingProfile.js";

const router = express.Router();

router.post("/create-employeeworkingprofile", createEmployeeWorkingProfileController);
router.get("/get-employeeworkingprofiles", getEmployeeWorkingProfilesController);
router.get("/get-employeeworkingprofile/:employee_id", getEmployeeWorkingProfileByEmployeeIdController);
router.delete("/delete-employeeworkingprofile/:id", deleteEmployeeWorkingProfileController);

export default router;
