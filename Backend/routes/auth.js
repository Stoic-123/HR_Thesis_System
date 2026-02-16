import express from "express";
import {
  employeeLoginController,
  employeeLogoutController,
} from "../controller/Auth.js";
import { requireAuth } from "../middleware/auth.js";
const router = express.Router();

router.post("/login", employeeLoginController);
router.post("/logout", requireAuth, employeeLogoutController);
export default router;
