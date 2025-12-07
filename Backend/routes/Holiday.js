import express from "express";
import {
  createHolidayController,
  deleteHolidayController,
  getHolidayController,
  updateHolidayController,
} from "../controller/Holiday.js";
const router = express.Router();
router.post("/create-holiday", createHolidayController);
router.get("/get-holiday/:company_id/:year", getHolidayController);
router.put("/update-holiday/:holiday_id", updateHolidayController);
router.delete("/delete-holiday/:holiday_id", deleteHolidayController);
export default router;
