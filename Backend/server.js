import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import fileUpload from "express-fileupload";
import { swaggerUi, swaggerSpec } from "./swagger/swagger.js";
import { requireAuth } from "./middleware/auth.js";

// Import routes
import employeeRoutes from "./routes/Employee.js";
import documentRoutes from "./routes/Document.js";
import companyRoutes from "./routes/Company.js";
import departmentRoutes from "./routes/Department.js";
import positionRoutes from "./routes/Position.js";
import roleRoutes from "./routes/Role.js";
import timemodeRoutes from "./routes/TimeMode.js";
import holidayRoutes from "./routes/Holiday.js";
import leaveTypeRoutes from "./routes/LeaveType.js";
import userRoutes from "./routes/User.js";
import authRoutes from "./routes/Auth.js";
import leaveRoute from "./routes/Leave.js";
const app = express();

//realtime log per request
app.use(morgan("tiny"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(
  fileUpload({
    createParentPath: true,
  }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests, please try again later.",
});

app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

// Public routes
app.use("/api/auth", authRoutes);

// Protected routes (apply middleware)
app.use(requireAuth);

app.use("/api/employee", employeeRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/position", positionRoutes);
app.use("/api/role", roleRoutes);
app.use("/api/timemode", timemodeRoutes);
app.use("/api/holiday", holidayRoutes);
app.use("/api/user", userRoutes);
app.use("/api/leavetype", leaveTypeRoutes);
app.use("/api/leave", leaveRoute);
app.get("/", (req, res) => {
  res.send("HR System API is running");
});

app.listen(8080, () => {
  console.log("http://localhost:8080");
});
