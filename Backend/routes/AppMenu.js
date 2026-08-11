// Backend/routes/AppMenu.js
import express from "express";
import { getAppMenusController, updateAppMenuController } from "../controller/AppMenu.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, getAppMenusController);
router.put("/:id", requireAuth, updateAppMenuController);

export default router;
