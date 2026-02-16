import { db } from "../config/db.js";
import jwt from "jsonwebtoken";

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies.auth_token;
    if (!token) {
      return res
        .status(401)
        .json({ result: false, message: "Unauthorized - No token" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await db.execute(
      "SELECT id, token_version FROM user WHERE id = ?",
      [decoded.id],
    );

    if (rows.length === 0) {
      return res.status(401).json({ result: false, message: "User not found" });
    }
    const user = rows[0];

    if (user.token_version !== decoded.token_version) {
      return res.status(401).json({
        message: "Token expired",
      });
    }
    req.user = user;
    next();
  } catch (error) {
    console.log(error.message);
    return res
      .status(401)
      .json({ result: false, message: "Invalid or expired token" });
  }
};
