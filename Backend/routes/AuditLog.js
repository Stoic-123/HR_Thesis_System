import express from "express";
import { getAuditLogsController } from "../controller/AuditLog.js";

const router = express.Router();

router.get("/get-all", getAuditLogsController);

export default router;
