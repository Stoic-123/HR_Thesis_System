import rateLimit from "express-rate-limit";

// Key generator helper that handles reverse proxies (like Caddy)
const keyGenerator = (req) => {
  return req.headers["x-forwarded-for"] || req.socket.remoteAddress;
};

const parseEnvInt = (val, defaultVal) => {
  if (val === undefined || val === null || val === "") return defaultVal;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultVal : parsed;
};

const disableLimiters = process.env.DISABLE_RATE_LIMITER === "true";

// Global rate limiter to prevent general DOS/abuse
export const globalRateLimiter = disableLimiters
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: parseEnvInt(process.env.RATE_LIMIT_GLOBAL_MAX, 5000), // Default to 5000 requests per window
      keyGenerator,
      message: {
        success: false,
        message: "Too many requests from this IP. Please try again after 15 minutes.",
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

// Strict rate limiter for sensitive authentication endpoints (brute-force protection)
export const authRateLimiter = disableLimiters
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: parseEnvInt(process.env.RATE_LIMIT_AUTH_MAX, 100), // Default to 100 attempts per window
      keyGenerator,
      message: {
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes to protect your account.",
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

