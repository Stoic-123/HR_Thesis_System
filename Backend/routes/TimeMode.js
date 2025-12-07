import express from "express";
import {
  createTimeModeController,
  getTimeModeController,
} from "../controller/TimeMode.js";
const router = express.Router();
router.post("/create-timemode", createTimeModeController);
router.get("/get-timemode/:company_id", getTimeModeController);
export default router;
