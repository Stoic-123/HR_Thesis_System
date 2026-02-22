import express from "express";
import {
  createTimeModeController,
  getTimeModeController,
} from "../controller/TimeMode.js";
const router = express.Router();
router.post("/create-timemode", createTimeModeController);
router.get("/get-timemode", getTimeModeController);
export default router;
