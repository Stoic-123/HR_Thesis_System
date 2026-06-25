import express from "express";
import {
  createTimeSheetController,
  getTimeSheetsController,
  getTimeSheetByIdController,
  updateTimeSheetController,
  deleteTimeSheetController,
} from "../controller/TimeSheet.js";

const router = express.Router();

router.post("/create-timesheet", createTimeSheetController);
router.get("/get-timesheets", getTimeSheetsController);
router.get("/get-timesheet/:id", getTimeSheetByIdController);
router.put("/update-timesheet/:id", updateTimeSheetController);
router.delete("/delete-timesheet/:id", deleteTimeSheetController);

export default router;
