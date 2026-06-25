import express from "express";
import {
  employeeLoginController,
  employeeLogoutController,
  getUserProfileController,
  changePasswordController,
  forgotPasswordController,
  resetPasswordController,
} from "../controller/auth.js";
import { requireAuth } from "../middleware/auth.js";
const router = express.Router();

router.post("/login", employeeLoginController);
router.post("/logout", requireAuth, employeeLogoutController);
router.get("/getMe", requireAuth, getUserProfileController);
router.post("/change-password", requireAuth, changePasswordController);
router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", requireAuth, resetPasswordController);
export default router;
