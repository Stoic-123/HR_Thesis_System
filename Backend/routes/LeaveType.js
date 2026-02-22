import express from "express";
import {
  createLeaveTypeController,
  deleteLeaveTypeController,
  getLeaveTypeController,
  updateLeaveTypeController,
} from "../controller/LeaveType.js";
const router = express.Router();
router.post("/create-leavetype", createLeaveTypeController);
router.get("/get-leavetype", getLeaveTypeController);
router.put("/update-leavetype/:id", updateLeaveTypeController);
router.delete("/delete-leavetype/:id", deleteLeaveTypeController);
export default router;
