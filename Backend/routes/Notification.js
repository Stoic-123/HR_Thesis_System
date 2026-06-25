import express from "express";
import { getNotifications, markAllRead, markRead } from "../controller/Notification.js";

const router = express.Router();

router.get("/", getNotifications);
router.put("/read-all", markAllRead);
router.put("/:id/read", markRead);

export default router;
