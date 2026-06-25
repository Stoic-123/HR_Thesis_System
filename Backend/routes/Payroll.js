import express from "express";
import { validate } from "../middleware/validate.js";
import {
  createPayrollPeriodSchema,
  generatePayrollSchema,
  approvePayrollSchema,
  markPaidPayrollSchema,
  updatePayrollSchema,
  exportPayrollSchema,
} from "../validation/payroll.schema.js";
import {
  createPayrollPeriodController,
  getPayrollPeriodsController,
  generatePayrollController,
  approvePayrollController,
  markPaidPayrollController,
  getPayrollsController,
  getPayrollByIdController,
  getEmployeePayrollsController,
  updatePayrollController,
  syncPayrollController,
  syncPayrollPeriodController,
  getMobileOverviewController,
  getMobileHistoryController,
  getPayslipController,
  exportExcelController,
  exportPdfController,
  getPayrollDashboardController,
  getPayrollPeriodDetailController,
} from "../controller/Payroll.js";

const router = express.Router();

// Dashboard
router.get("/dashboard", getPayrollDashboardController);

// Mobile APIs
router.get("/mobile/overview", getMobileOverviewController);
router.get("/mobile/history", getMobileHistoryController);

// Payroll operations
router.post("/generate", validate(generatePayrollSchema), generatePayrollController);
router.post("/approve", validate(approvePayrollSchema), approvePayrollController);
router.post("/mark-paid", validate(markPaidPayrollSchema), markPaidPayrollController);

// Export
router.post("/export/excel", validate(exportPayrollSchema), exportExcelController);
router.post("/export/pdf", validate(exportPayrollSchema), exportPdfController);

// List & detail - order matters: specific routes before :id
router.get("/employee/:employeeId", getEmployeePayrollsController);
router.get("/period/:id", getPayrollPeriodDetailController);
router.post("/period/:id/sync", syncPayrollPeriodController);
router.get("/", getPayrollsController);
router.get("/:id/payslip", getPayslipController);
router.get("/:id", getPayrollByIdController);
router.put("/:id", validate(updatePayrollSchema), updatePayrollController);
router.post("/:id/sync", syncPayrollController);

export default router;
