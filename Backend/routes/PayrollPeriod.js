import express from "express";
import { validate } from "../middleware/validate.js";
import { createPayrollPeriodSchema } from "../validation/payroll.schema.js";
import {
  createPayrollPeriodController,
  getPayrollPeriodsController,
  deletePayrollPeriodController,
} from "../controller/Payroll.js";

const router = express.Router();

router.post("/", validate(createPayrollPeriodSchema), createPayrollPeriodController);
router.get("/", getPayrollPeriodsController);
router.delete("/:id", deletePayrollPeriodController);

export default router;
