import express from "express";
import { createNewLeaveController } from "../controller/Leave.js";
const router = express.Router();

router.post("/request-leave", createNewLeaveController);

export default router;
