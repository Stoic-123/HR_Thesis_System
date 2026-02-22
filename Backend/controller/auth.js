import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import {
  employeeChecker,
  getCompanyID,
  InvalidateToken,
} from "../service/Auth.js";
dotenv.config();

const generateToken = (id, username, company_id, token_version) => {
  const payload = { id, username, company_id, token_version };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.EXPIRED_AT || "2h",
  });
};

export const employeeLoginController = async (req, res) => {
  try {
    const { username, password } = req.body;
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
    const company_id = await getCompanyID(existingEmployee.employee_id);
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
    const token = await generateToken(
      existingEmployee.id,
      existingEmployee.username,
      company_id,
      existingEmployee.token_version,
    );
    await res.cookie("auth_token", token, {
      maxAge: 3 * 24 * 60 * 60,
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    res.status(200).json({
      result: true,
      message: "Login to the employee account successfully.",
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
export const employeeLogoutController = async (req, res) => {
  const userId = req.user.id;

  await InvalidateToken(userId);

  res.clearCookie("auth_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
  });

  res.json({
    result: true,
    message: "Logout successful",
  });
};
