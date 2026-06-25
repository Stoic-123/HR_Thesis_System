import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createLeaveProfileController,
  getLeaveProfilesController,
  getEmployeeLeaveProfileController,
  updateLeaveProfileController,
  deleteLeaveProfileController,
  syncLeaveProfilesController,
} from "../controller/LeaveProfile.js";
const router = express.Router();

router.post("/create", requireAuth, createLeaveProfileController);
router.get("/all", requireAuth, getLeaveProfilesController);
router.get("/employee/:employee_id", requireAuth, getEmployeeLeaveProfileController);
router.put("/update/:id", requireAuth, updateLeaveProfileController);
router.delete("/delete/:id", requireAuth, deleteLeaveProfileController);
router.post("/sync", requireAuth, syncLeaveProfilesController);

export default router;
