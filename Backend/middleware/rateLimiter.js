import rateLimit from "express-rate-limit";

// Key generator helper that handles reverse proxies (like Caddy)
const keyGenerator = (req) => {
  return req.headers["x-forwarded-for"] || req.socket.remoteAddress;
};

// Global rate limiter to prevent general DOS/abuse
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  keyGenerator,
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for sensitive authentication endpoints (brute-force protection)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 attempts per window
  keyGenerator,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes to protect your account.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
