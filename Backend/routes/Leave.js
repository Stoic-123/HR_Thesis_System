import express from "express";
import {
  createNewLeaveController,
  getMyLeavesController,
  getLeaveSummaryController,
  getAllLeavesController,
  approveLeaveController,
  rejectLeaveController,
  getPendingLeavesForManagerController,
  cancelLeaveController,
} from "../controller/Leave.js";
import { validate } from "../middleware/validate.js";
import { createLeaveSchema } from "../validation/leave.schema.js";
const router = express.Router();

router.post("/request-leave", validate(createLeaveSchema), createNewLeaveController);
router.get("/my-leaves", getMyLeavesController);
router.get("/summary", getLeaveSummaryController);
router.get("/all", getAllLeavesController);
router.get("/pending", getPendingLeavesForManagerController);
router.put("/approve/:id", approveLeaveController);
router.put("/reject/:id", rejectLeaveController);
router.put("/cancel/:id", cancelLeaveController);

export default router;
