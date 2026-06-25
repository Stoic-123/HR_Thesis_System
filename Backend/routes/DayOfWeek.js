import express from "express";
import {
  createDayOfWeekController,
  getDayOfWeeksController,
  getDayOfWeekByIdController,
  updateDayOfWeekController,
  deleteDayOfWeekController,
} from "../controller/DayOfWeek.js";

const router = express.Router();

router.post("/create-dayofweek", createDayOfWeekController);
router.get("/get-dayofweeks", getDayOfWeeksController);
router.get("/get-dayofweek/:id", getDayOfWeekByIdController);
router.put("/update-dayofweek/:id", updateDayOfWeekController);
router.delete("/delete-dayofweek/:id", deleteDayOfWeekController);

export default router;
