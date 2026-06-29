import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";

export const requireAuth = async (req, res, next) => {
  const clearCookieOptions = { httpOnly: true, sameSite: "none", secure: true };
  if (process.env.COOKIE_DOMAIN) {
    clearCookieOptions.domain = process.env.COOKIE_DOMAIN;
  }

  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      token = req.cookies.auth_token;
    }

    if (!token) {
      res.clearCookie("auth_token", clearCookieOptions);
      return res
        .status(401)
        .json({ result: false, message: "Unauthorized - No token" });
    }
    console.log("[AuthMiddleware] Received Token:", token);
    console.log("[AuthMiddleware] JWT_SECRET used for verification:", process.env.JWT_SECRET);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        token_version: true,
        employee: {
          select: {
            id: true,
            company_id: true,
          },
        },
      },
    });

    if (!user) {
      res.clearCookie("auth_token", clearCookieOptions);
      return res.status(401).json({ result: false, message: "User not found" });
    }

    if (user.token_version !== decoded.token_version) {
      res.clearCookie("auth_token", clearCookieOptions);
      return res.status(401).json({
        message: "Token expired",
      });
    }
    req.user = {
      id: user.id,
      token_version: user.token_version,
      company_id: user.employee?.company_id,
      employee_id: user.employee?.id,
    };
    next();
  } catch (error) {
    console.error("[AuthMiddleware] Verification failed:", error);
    res.clearCookie("auth_token", clearCookieOptions);
    return res
      .status(401)
      .json({ result: false, message: "Invalid or expired token" });
  }
};
