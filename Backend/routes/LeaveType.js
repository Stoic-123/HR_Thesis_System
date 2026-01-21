import express from "express";
import { createLeaveTypeController } from "../controller/LeaveType.js";
const router = express.Router();
router.post("/create-leavetype", createLeaveTypeController);
export default router;
