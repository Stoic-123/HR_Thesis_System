import express from "express";
import {
  createTimeModeController,
  getTimeModeController,
  updateTimeModeController,
  deleteTimeModeController,
} from "../controller/TimeMode.js";
const router = express.Router();
router.post("/create-timemode", createTimeModeController);
router.get("/get-timemode", getTimeModeController);
router.put("/update-timemode/:id", updateTimeModeController);
router.delete("/delete-timemode/:id", deleteTimeModeController);
export default router;
