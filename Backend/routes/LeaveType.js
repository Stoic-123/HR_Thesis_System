import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createLeaveTypeController,
  deleteLeaveTypeController,
  getLeaveTypeController,
  updateLeaveTypeController,
} from "../controller/LeaveType.js";
const router = express.Router();
router.post("/create-leavetype", requireAuth, createLeaveTypeController);
router.get("/get-leavetype", requireAuth, getLeaveTypeController);
router.put("/update-leavetype/:id", requireAuth, updateLeaveTypeController);
router.delete("/delete-leavetype/:id", requireAuth, deleteLeaveTypeController);
export default router;
