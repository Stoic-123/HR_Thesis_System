import express from "express";
import { getMobileCalendarController } from "../controller/Calendar.js";

const router = express.Router();

router.get("/mobile", getMobileCalendarController);

export default router;
