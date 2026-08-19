process.on("uncaughtException", (err) => {
  console.error("💥 CRITICAL UNCAUGHT EXCEPTION:");
  console.error(err.stack || err);
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 CRITICAL UNHANDLED REJECTION:");
  console.error(reason?.stack || reason);
  process.exit(1);
});

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import { globalRateLimiter } from "./middleware/rateLimiter.js";
import fileUpload from "express-fileupload";
import { swaggerUi, swaggerSpec } from "./swagger/swagger.js";
import { requireAuth } from "./middleware/auth.js";
import { processTelegramCallbacks } from "./service/TelegramApproval.js";
import { checkAndSendAttendanceReminders } from "./service/Reminder.js";
import { checkAndRunDatabaseBackup } from "./service/Backup.js";


// Import routes
import employeeRoutes from "./routes/Employee.js";
import documentRoutes from "./routes/Document.js";
import companyRoutes from "./routes/Company.js";
import locationRoutes from "./routes/Location.js";

import departmentRoutes from "./routes/Department.js";
import positionRoutes from "./routes/Position.js";
import roleRoutes from "./routes/Role.js";
import timemodeRoutes from "./routes/TimeMode.js";
import holidayRoutes from "./routes/Holiday.js";
import leaveTypeRoutes from "./routes/LeaveType.js";
import userRoutes from "./routes/User.js";
import authRoutes from "./routes/Auth.js";
import leaveRoute from "./routes/Leave.js";
import auditLogRoutes from "./routes/AuditLog.js";
import scannerRoutes from "./routes/Scanner.js";
import aiRoutes from "./routes/AI.js";
import attendanceRoutes from "./routes/Attendance.js";
import timeSheetRoutes from "./routes/TimeSheet.js";
import dayOfWeekRoutes from "./routes/DayOfWeek.js";
import employeeWorkingProfileRoutes from "./routes/EmployeeWorkingProfile.js";
import overtimeRoutes from "./routes/Overtime.js";
import leaveProfileRoutes from "./routes/LeaveProfile.js";
import payrollRoutes from "./routes/Payroll.js";
import payrollPeriodRoutes from "./routes/PayrollPeriod.js";
import kpiRoutes from "./routes/kpi.routes.js";
import calendarRoutes from "./routes/Calendar.js";
import assetRoutes from "./routes/asset.routes.js";
import notificationRoutes from "./routes/Notification.js";
import announcementRoutes from "./routes/Announcement.js";
import appMenuRoutes from "./routes/AppMenu.js";
import recruitmentRoutes from "./routes/recruitment.routes.js";
import lateRequestRoutes from "./routes/LateRequest.js";
import http from "http";
import { initSocket } from "./utils/socket.js";

const app = express();

// Middleware
app.set("trust proxy", 1);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins in development or specific ones
      if (
        !origin ||
        origin === "null" ||
        origin === "undefined" ||
        origin.startsWith("http://localhost") ||
        origin.startsWith("http://localhost:8085") ||
        origin.startsWith("http://localhost:8081") ||
        origin.startsWith("http://192.168") ||
        origin.startsWith("http://172.20") ||
        origin.startsWith("exp://") ||
        origin.startsWith("https://bayon-market-thesis.proxy.mekongtunnel.dev") ||
        origin.startsWith("https://bayonhr.shop") 
      ) {
        callback(null, true);
      } else {
        // Fallback to allow any origin in development to avoid blocks
        callback(null, true);
      }
    },
    credentials: true,
  }),
);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(morgan("tiny"));

const swaggerUiOptions = {
  customSiteTitle: "HR Management System API Docs",
  customCss: ".swagger-ui .topbar { display: block; background-color: #0f172a; }",
  swaggerOptions: {
    persistAuthorization: true,
  },
};

// Raw OpenAPI JSON spec for tooling/client generation
app.get("/api/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json(swaggerSpec);
});

app.use("/api/docs", swaggerUi.serveFiles(swaggerSpec, swaggerUiOptions), swaggerUi.setup(swaggerSpec, swaggerUiOptions));
app.use("/api-docs", swaggerUi.serveFiles(swaggerSpec, swaggerUiOptions), swaggerUi.setup(swaggerSpec, swaggerUiOptions));

app.use(
  fileUpload({
    createParentPath: true,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    abortOnLimit: true,
    responseOnLimit: "File size limit exceeded (max 10MB)",
  }),
);

app.use(globalRateLimiter);
app.use(express.json());
import fs from "fs";
import path from "path";

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Serve uploaded files — serve local disk files first, then proxy from Cloudflare R2
app.get("/uploads/*path", async (req, res) => {
  try {
    const key = req.path.replace(/^\/uploads\//, ""); // e.g. "exports/payroll_summary_xxx.xlsx"
    const localPath = path.join(process.cwd(), "public", "uploads", key);

    // 1. First check if file exists locally on disk (e.g. exports, payslips, local uploads)
    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }

    // 2. Fallback to Cloudflare R2 if configured
    const r2Base = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
    if (!r2Base) {
      return res.status(404).json({ error: "File not found" });
    }
    const r2Url = `${r2Base}/${key}`;
    const r2Res = await fetch(r2Url);

    if (!r2Res.ok) {
      return res.status(r2Res.status).send("File not found on R2 or disk");
    }

    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "public, max-age=86400");
    const contentType = r2Res.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    const arrayBuffer = await r2Res.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("[Uploads Proxy Error]:", err.message);
    return res.status(500).json({ error: "Failed to fetch file from storage" });
  }
});

// Public routes
app.use("/api/auth", authRoutes);
app.use("/api/recruitment", recruitmentRoutes);

// Protected routes (apply middleware)
app.use(requireAuth);

app.use("/api/employee", employeeRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/department", departmentRoutes);

app.use("/api/position", positionRoutes);
app.use("/api/role", roleRoutes);
app.use("/api/timemode", timemodeRoutes);
app.use("/api/holiday", holidayRoutes);
app.use("/api/user", userRoutes);
app.use("/api/leavetype", leaveTypeRoutes);
app.use("/api/leave", leaveRoute);
app.use("/api/auditlog", auditLogRoutes);
app.use("/api/scanner", scannerRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/timesheet", timeSheetRoutes);
app.use("/api/dayofweek", dayOfWeekRoutes);
app.use("/api/employeeworkingprofile", employeeWorkingProfileRoutes);
app.use("/api/overtime", overtimeRoutes);
app.use("/api/leaveprofile", leaveProfileRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/payroll-periods", payrollPeriodRoutes);
app.use("/api/kpi", kpiRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/asset", assetRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/announcement", announcementRoutes);
app.use("/api/app-menu", appMenuRoutes);
app.use("/api/late-request", lateRequestRoutes);

app.get("/", (req, res) => {
  res.send("HR System API is running");
});

app.use((err, req, res, next) => {
  res.send("HR System API is running");
});

const server = http.createServer(app);
initSocket(server);

server.listen(8080, "0.0.0.0", () => {
  console.log("http://localhost:8080");
  console.log("http://192.168.38.126:8080");

  // ── Telegram approval cron — poll every 5 seconds ──────────────────────────
  setInterval(() => {
    processTelegramCallbacks().catch((e) =>
      console.error('[Cron] TelegramApproval error:', e.message)
    );
  }, 5000);
  console.log('[Cron] Telegram approval poller started (5s interval)');

  // ── Telegram individual attendance reminders cron — poll every 60 seconds ──
  setInterval(() => {
    checkAndSendAttendanceReminders().catch((e) =>
      console.error('[Cron] Attendance reminder error:', e.message)
    );
  }, 60000);
  console.log('[Cron] Attendance reminder poller started (60s interval)');

  // ── Database Backup cron — poll every 60 seconds ───────────────────────────
  setInterval(() => {
    checkAndRunDatabaseBackup().catch((e) =>
      console.error('[Cron] DatabaseBackup error:', e.message)
    );
  }, 60000);
  console.log('[Cron] Database backup scheduler started (60s interval)');
});


