import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import prisma from "../lib/prisma.js";
import {
  employeeChecker,
  employeeRoleChecker,
  getCompanyID,
  getMe,
  InvalidateToken,
  changePassword,
  forgotPassword,
  resetPasswordToDefault,
} from "../service/Auth.js";
dotenv.config();

const generateToken = (id, username, company_id, token_version) => {
  const payload = { id, username, company_id, token_version };
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.EXPIRED_AT || "2h",
  });
  console.log("[Auth] Generated Token:", token);
  console.log("[Auth] JWT_SECRET used for signing:", process.env.JWT_SECRET);
  return token;
};

export const employeeLoginController = async (req, res) => {
  try {
    const { username, password, client } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ result: false, message: "Both fields are required..!" });
    }
    const existingEmployee = await employeeChecker(username);
    if (!existingEmployee) {
      return res.status(400).json({
        result: false,
        message: "This username not found in the system..!",
      });
    }

    if (!existingEmployee.employee_id) {
      return res.status(400).json({
        result: false,
        message: "This user is not associated with an employee record..!",
      });
    }

    const company_id = await getCompanyID(existingEmployee.employee_id);
    const role = await employeeRoleChecker(username);
    console.log(`User: ${username}, Role: ${role}, Client: ${client || "web"}`);

    const isPasswordValid = await bcrypt.compare(
      password,
      existingEmployee.password,
    );
    if (!isPasswordValid) {
      return res.status(400).json({
        result: false,
        message: "Invalid password, Please try again..!",
      });
    }

    // Dynamic Permission Checks
    const employeeWithRole = await prisma.employee.findUnique({
      where: { id: existingEmployee.employee_id },
      include: {
        role: {
          include: {
            rolebaseaccess: true,
          },
        },
      },
    });

    const userPermissions = employeeWithRole?.role?.rolebaseaccess || [];
    const roleName = employeeWithRole?.role?.name || "";

    // Fallback: If no permissions are set yet, default to standard role behavior
    const hasMobileAccess = userPermissions.some(p => p.path === "app:mobile_login") || roleName === "Employee" || roleName === "Manager";
    const hasWebAccess = userPermissions.some(p => p.path === "app:web_login") || roleName === "Admin" || roleName === "Manager" || roleName === "HR";

    if (client === "mobile") {
      if (!hasMobileAccess) {
        return res.status(403).json({
          result: false,
          message: "Forbidden, you do not have permission to login to the mobile app..!",
        });
      }
    } else {
      if (!hasWebAccess) {
        return res.status(403).json({
          result: false,
          message: "Forbidden, you do not have permission to login to the web dashboard..!",
        });
      }
    }

    const token = await generateToken(
      existingEmployee.id,
      existingEmployee.username,
      company_id,
      existingEmployee.token_version,
    );
    await res.cookie("auth_token", token, {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      httpOnly: true,
      secure: true,
      sameSite: "none",
    }); 
    res.status(200).json({
      result: true,
      message: "Login successful.",
      token: token,
      is_default_password: existingEmployee.is_default_password,
    });
    console.log("[Auth] Returned token to client:", token);
  } catch (error) {
    console.error("[AuthMiddleware] Verification failed:", error);
    res.clearCookie("auth_token", { httpOnly: true, sameSite: "none", secure: true });
  }
};

export const changePasswordController = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({
        result: false,
        message: "All fields are required.",
      });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({
        result: false,
        message: "New passwords do not match.",
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        result: false,
        message: "New password must be at least 6 characters.",
      });
    }

    const changePasswordResult = await changePassword(
      user_id,
      current_password,
      new_password
    );

    res.status(200).json(changePasswordResult);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const employeeLogoutController = async (req, res) => {
  const userId = req.user.id;

  await InvalidateToken(userId);

  res.clearCookie("auth_token", {
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });

  res.json({
    result: true,
    message: "Logout successful",
  });
};
export const getUserProfileController = async (req, res) => {
  try {
    const userId = req.user.id;

    const userProfileGetData = await getMe(userId);
    res.status(200).json(userProfileGetData);
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
    console.log(error.message);
  }
};

export const forgotPasswordController = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        result: false,
        message: "Username is required.",
      });
    }

    const forgotPasswordResult = await forgotPassword(username);
    res.status(200).json(forgotPasswordResult);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const resetPasswordController = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        result: false,
        message: "User ID is required.",
      });
    }

    const resetPasswordResult = await resetPasswordToDefault(user_id);
    res.status(200).json(resetPasswordResult);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
