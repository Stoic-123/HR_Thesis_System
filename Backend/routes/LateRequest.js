import express from "express";
import {
  createLateRequestController,
  getMyLateRequestsController,
  getAllLateRequestsController,
  getPendingLateRequestsController,
  approveLateRequestController,
  rejectLateRequestController,
} from "../controller/LateRequest.js";

const router = express.Router();

router.post("/request-late", createLateRequestController);
router.get("/my-late-requests", getMyLateRequestsController);
router.get("/all", getAllLateRequestsController);
router.get("/pending", getPendingLateRequestsController);
router.put("/approve/:id", approveLateRequestController);
router.put("/reject/:id", rejectLateRequestController);

export default router;
