import express from "express";
import {
  employeeLoginController,
  employeeLogoutController,
  getUserProfileController,
  changePasswordController,
  forgotPasswordController,
  resetPasswordController,
} from "../controller/Auth.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validation/auth.schema.js";
import { authRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/login", authRateLimiter, validate(loginSchema), employeeLoginController);
router.post("/logout", requireAuth, employeeLogoutController);
router.get("/getMe", requireAuth, getUserProfileController);
router.post("/change-password", requireAuth, validate(changePasswordSchema), changePasswordController);
router.post("/forgot-password", authRateLimiter, validate(forgotPasswordSchema), forgotPasswordController);
router.post("/reset-password", requireAuth, authRateLimiter, validate(resetPasswordSchema), resetPasswordController);

export default router;
