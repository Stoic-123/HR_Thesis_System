import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import fileUpload from "express-fileupload";
import { swaggerUi, swaggerSpec } from "./swagger/swagger.js";

const app = express();
//realtime log per request
app.use(morgan("tiny"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(
  fileUpload({
    createParentPath: true,
  })
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
import employeeRoutes from "./routes/Employee.js";
import documentRoutes from "./routes/Document.js";
import companyRoutes from "./routes/Company.js";
import departmentRoutes from "./routes/Department.js";
import positionRoutes from "./routes/Position.js";
import roleRoutes from "./routes/Role.js";
//employee routes
app.use("/api/employee", employeeRoutes);
//document routes
app.use("/api/document", documentRoutes);
//company routes
app.use("/api/company", companyRoutes);
//department routes
app.use("/api/department", departmentRoutes);
//position routes
app.use("/api/position", positionRoutes);
//role routes
app.use("/api/role", roleRoutes);
app.listen(8080, () => {
  console.log("http://localhost:8080");
});
