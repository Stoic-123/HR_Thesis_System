import express from "express";
import { clockController, onlineAttendanceController, getAttendanceRecordsController, getAttendanceReportController } from "../controller/Attendance.js";

const router = express.Router();

router.post("/clock", clockController);
router.post("/online", onlineAttendanceController);
router.get("/records", getAttendanceRecordsController);
router.get("/report", getAttendanceReportController);

export default router;
