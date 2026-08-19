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
  resetPassword,
} from "../service/Auth.js";
import { validateFile } from "../utils/fileValidation.js";
import { uploadToStorage } from "../service/Storage.js";
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
      const newEmp = await prisma.employee.create({
        data: {
          first_name: existingEmployee.username,
          last_name: "",
          company_id: 1,
          is_active: "active",
        },
      });
      await prisma.user.update({
        where: { id: existingEmployee.id },
        data: { employee_id: newEmp.id },
      });
      existingEmployee.employee_id = newEmp.id;
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
    const roleLower = roleName.toLowerCase();
    const hasMobileAccess = userPermissions.some(p => p.path === "app:mobile_login") || roleLower.includes("employee") || roleLower.includes("manager");
    const hasWebAccess = userPermissions.some(p => p.path === "app:web_login") || roleLower.includes("admin") || roleLower.includes("manager") || roleLower.includes("hr");

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
    const isProduction = !!process.env.COOKIE_DOMAIN;
    const cookieOptions = {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    };
    if (isProduction && process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }
    await res.cookie("auth_token", token, cookieOptions); 
    res.status(200).json({
      result: true,
      message: "Login successful.",
      token: token,
      is_default_password: existingEmployee.is_default_password,
    });
    console.log("[Auth] Returned token to client:", token);
  } catch (error) {
    console.error("[AuthMiddleware] Verification failed:", error);
    const isProduction = !!process.env.COOKIE_DOMAIN;
    const clearCookieOptions = { httpOnly: true, sameSite: isProduction ? "none" : "lax", secure: isProduction };
    if (isProduction && process.env.COOKIE_DOMAIN) {
      clearCookieOptions.domain = process.env.COOKIE_DOMAIN;
    }
    res.clearCookie("auth_token", clearCookieOptions);
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

  const isProduction = !!process.env.COOKIE_DOMAIN;
  const clearCookieOptions = {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
  };
  if (isProduction && process.env.COOKIE_DOMAIN) {
    clearCookieOptions.domain = process.env.COOKIE_DOMAIN;
  }
  res.clearCookie("auth_token", {
	path: "/", httpOnly: true,
	sameSite: "lax"
});
	res.clearCookie("auth_token", {
	path: "/" });
	res.clearCookie("auth_token");

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

    const resetPasswordResult = await resetPassword(user_id);
    res.status(200).json(resetPasswordResult);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const updateUserProfileController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      first_name, 
      last_name, 
      username, 
      email, 
      gender, 
      telegram_username, 
      phone_number, 
      phone_number1, 
      phone_number2, 
      address, 
      partner_name 
    } = req.body;
    let profile_path = null;

    if (req.files && (req.files.profile_path || req.files.avatar || req.files.file)) {
      const fileObj = req.files.profile_path || req.files.avatar || req.files.file;
      const fileCheck = validateFile(fileObj, "image");
      if (!fileCheck.isValid) {
        return res.status(400).json({ result: false, message: fileCheck.message });
      }
      const profileName = Date.now() + "_" + fileObj.name;
      profile_path = await uploadToStorage(fileObj.data, "profiles", profileName, fileObj.mimetype);
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        employee: {
          include: {
            role: true,
          }
        }
      },
    });

    if (!currentUser) {
      return res.status(404).json({ result: false, message: "User not found" });
    }

    const isAdmin = currentUser.employee?.role?.name?.toLowerCase().includes("admin") || !currentUser.employee_id;

    // Handle username update if provided (admin only)
    if (isAdmin && username && username.trim() && username.trim() !== currentUser.username) {
      const cleanUsername = username.trim();
      const existingUser = await prisma.user.findUnique({ where: { username: cleanUsername } });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ result: false, message: "Username is already taken" });
      }
      await prisma.user.update({
        where: { id: userId },
        data: { username: cleanUsername },
      });
    }

    // Validate email format if provided
    if (email !== undefined && email !== null && email.trim() !== "") {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ result: false, message: "Invalid email format" });
      }
    }

    // Validate gender if provided
    if (gender !== undefined && gender !== null && gender !== "") {
      const cleanGender = gender.toString().toLowerCase().trim();
      const validGenders = ["male", "female", "other"];
      if (!validGenders.includes(cleanGender)) {
        return res.status(400).json({ result: false, message: "Gender must be 'male', 'female', or 'other'" });
      }
    }

    // Handle employee update or creation
    if (currentUser.employee_id && currentUser.employee) {
      const empUpdate = {};

      // Only Admins can modify first_name, last_name, and profile_path directly
      if (isAdmin) {
        if (first_name !== undefined && first_name !== null && first_name.trim() !== "") {
          empUpdate.first_name = first_name.trim();
        }
        if (last_name !== undefined && last_name !== null) {
          empUpdate.last_name = last_name.trim();
        }
        if (profile_path) {
          empUpdate.profile_path = profile_path;
        }
      }

      // Fields every employee can update: email, telegram_username, phone_number, address, gender
      if (email !== undefined) {
        empUpdate.email = email && email.trim() !== "" ? email.trim().toLowerCase() : null;
      }

      if (gender !== undefined) {
        const cleanGender = gender.toString().toLowerCase().trim();
        if (["male", "female", "other"].includes(cleanGender)) {
          empUpdate.gender = cleanGender;
        }
      }

      if (telegram_username !== undefined) {
        empUpdate.telegram_username = telegram_username ? telegram_username.trim().replace(/^@+/, '') : null;
      }

      const rawPhone = phone_number !== undefined ? phone_number : phone_number1;
      if (rawPhone !== undefined) {
        empUpdate.phone_number1 = rawPhone && rawPhone.trim() !== "" ? rawPhone.trim() : null;
      }

      if (phone_number2 !== undefined) {
        empUpdate.phone_number2 = phone_number2 && phone_number2.trim() !== "" ? phone_number2.trim() : null;
      }

      if (address !== undefined) {
        empUpdate.address = address && address.trim() !== "" ? address.trim() : null;
      }

      if (partner_name !== undefined) {
        empUpdate.partner_name = partner_name && partner_name.trim() !== "" ? partner_name.trim() : null;
      }

      if (Object.keys(empUpdate).length > 0) {
        await prisma.employee.update({
          where: { id: currentUser.employee_id },
          data: empUpdate,
        });
      }
    } else {
      // Create employee record for admin user if missing
      const companyId = req.user.company_id || currentUser.company_id || 1;
      const newEmp = await prisma.employee.create({
        data: {
          first_name: first_name ? first_name.trim() : (currentUser.username || "Admin"),
          last_name: last_name ? last_name.trim() : "",
          company_id: parseInt(companyId),
          profile_path: profile_path || null,
          email: email && email.trim() !== "" ? email.trim().toLowerCase() : null,
          phone_number1: phone_number || phone_number1 || null,
          address: address || null,
          gender: gender ? gender.toLowerCase() : "other",
          telegram_username: telegram_username ? telegram_username.trim().replace(/^@+/, '') : null,
          is_active: "active",
        },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { employee_id: newEmp.id },
      });
    }

    return res.status(200).json({
      result: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res.status(500).json({ result: false, message: error.message });
  }
};
