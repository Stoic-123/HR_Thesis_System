import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createOvertimeController,
  getMyOvertimesController,
  getAllOvertimesController,
  getPendingOvertimesForManagerController,
  approveOvertimeController,
  rejectOvertimeController,
  cancelOvertimeController,
} from "../controller/Overtime.js";
const router = express.Router();

router.post("/request-overtime", requireAuth, createOvertimeController);
router.get("/my-overtimes", requireAuth, getMyOvertimesController);
router.get("/all", requireAuth, getAllOvertimesController);
router.get("/pending", requireAuth, getPendingOvertimesForManagerController);
router.put("/approve/:id", requireAuth, approveOvertimeController);
router.put("/reject/:id", requireAuth, rejectOvertimeController);
router.put("/cancel/:id", requireAuth, cancelOvertimeController);

export default router;
