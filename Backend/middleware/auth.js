import prisma from "../lib/prisma.js";
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
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        token_version: true,
        employee: {
          select: {
            company_id: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ result: false, message: "User not found" });
    }

    if (user.token_version !== decoded.token_version) {
      return res.status(401).json({
        message: "Token expired",
      });
    }
    req.user = {
      id: user.id,
      token_version: user.token_version,
      company_id: user.employee?.company_id,
    };
    next();
  } catch (error) {
    console.log(error.message);
    return res
      .status(401)
      .json({ result: false, message: "Invalid or expired token" });
  }
};
