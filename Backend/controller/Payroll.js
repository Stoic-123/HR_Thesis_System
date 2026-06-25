import path from "path";
import fs from "fs";
import {
  createPayrollPeriod,
  getPayrollPeriods,
  getPayrollDashboard,
  generatePayroll,
  approvePayroll,
  markPayrollPaid,
  getPayrolls,
  getPayrollById,
  getEmployeePayrolls,
  updatePayroll,
  syncPayrollBaseSalary,
  syncPayrollPeriodBaseSalaries,
  removePayrollPeriod,
  getMobileOverview,
  getMobileHistory,
  getPayslipDownload,
  getPayrollPeriodDetail,
} from "../service/Payroll.js";
import { exportPayrollExcel, exportPayrollPdf } from "../service/PayrollExport.js";
import { addAuditLog } from "../service/AuditLog.js";

const audit = async (req, action, description) => {
  await addAuditLog(
    req.user.id,
    req.user.company_id,
    "Payroll",
    action,
    description,
    null,
    req.ip,
    req.headers["user-agent"],
  );
};

export const createPayrollPeriodController = async (req, res) => {
  try {
    const result = await createPayrollPeriod(req.user.company_id, req.body);
    await audit(req, "CREATE", `Created payroll period: ${req.body.name}`);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getPayrollPeriodsController = async (req, res) => {
  try {
    const result = await getPayrollPeriods(req.user.company_id, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export const deletePayrollPeriodController = async (req, res) => {
  try {
    const result = await removePayrollPeriod(req.user.company_id, Number(req.params.id));
    await audit(req, "Delete Payroll Period", `Deleted payroll period ID ${req.params.id}`);
    res.json(result);
  } catch (error) {
    res.status(400).json({ result: false, message: error.message });
  }
};

export const getPayrollDashboardController = async (req, res) => {
  try {
    const result = await getPayrollDashboard(req.user.company_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export const generatePayrollController = async (req, res) => {
  try {
    const result = await generatePayroll(req.user.company_id, req.body.payroll_period_id);
    await audit(req, "GENERATE", `Generated payroll for period ${req.body.payroll_period_id}`);
    res.json(result);
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export const approvePayrollController = async (req, res) => {
  try {
    const result = await approvePayroll(req.user.company_id, req.body.payroll_period_id);
    await audit(req, "APPROVE", `Approved payroll period ${req.body.payroll_period_id}`);
    res.json(result);
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export const markPaidPayrollController = async (req, res) => {
  try {
    const result = await markPayrollPaid(req.user.company_id, req.body.payroll_period_id);
    await audit(req, "PAID", `Marked payroll period ${req.body.payroll_period_id} as paid`);
    res.json(result);
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getPayrollsController = async (req, res) => {
  try {
    const result = await getPayrolls(req.user.company_id, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getPayrollByIdController = async (req, res) => {
  try {
    const result = await getPayrollById(req.user.company_id, Number(req.params.id));
    res.json(result);
  } catch (error) {
    res.status(404).json({ result: false, message: error.message });
  }
};

export const getEmployeePayrollsController = async (req, res) => {
  try {
    const result = await getEmployeePayrolls(
      req.user.company_id,
      Number(req.params.employeeId),
      req.query.year ? Number(req.query.year) : undefined,
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export const syncPayrollController = async (req, res) => {
  try {
    const result = await syncPayrollBaseSalary(
      req.user.company_id,
      Number(req.params.id),
      req.user.id
    );
    await audit(req, "UPDATE", `Synced base salary for payroll record ${req.params.id}`);
    res.json(result);
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export const syncPayrollPeriodController = async (req, res) => {
  try {
    const result = await syncPayrollPeriodBaseSalaries(
      req.user.company_id,
      Number(req.params.id),
      req.user.id
    );
    await audit(req, "UPDATE", `Synced base salaries for payroll period ${req.params.id}`);
    res.json(result);
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export const updatePayrollController = async (req, res) => {
  try {
    const result = await updatePayroll(
      req.user.company_id,
      Number(req.params.id),
      req.body,
      req.user.id,
    );
    await audit(req, "UPDATE", `Updated payroll record ${req.params.id}`);
    res.json(result);
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getMobileOverviewController = async (req, res) => {
  try {
    const result = await getMobileOverview(req.user.company_id, req.user.employee_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getMobileHistoryController = async (req, res) => {
  try {
    const result = await getMobileHistory(
      req.user.company_id,
      req.user.employee_id,
      req.query.year ? Number(req.query.year) : undefined,
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getPayslipController = async (req, res) => {
  try {
    const result = await getPayslipDownload(req.user.company_id, Number(req.params.id));
    const { filePath, fileName } = result.data;

    if (req.query.download === "true" && fs.existsSync(filePath)) {
      return res.download(filePath, fileName);
    }

    res.json(result);
  } catch (error) {
    res.status(404).json({ result: false, message: error.message });
  }
};

export const exportExcelController = async (req, res) => {
  try {
    const exportResult = await exportPayrollExcel(req.user.company_id, req.body);
    if (req.body.direct_download) {
      return res.download(exportResult.filePath, exportResult.fileName);
    }
    res.json({ result: true, data: exportResult });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export const exportPdfController = async (req, res) => {
  try {
    const exportResult = await exportPayrollPdf(req.user.company_id, req.body);
    if (req.body.direct_download) {
      return res.download(exportResult.filePath, exportResult.fileName);
    }
    res.json({ result: true, data: exportResult });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getPayrollPeriodDetailController = async (req, res) => {
  try {
    const result = await getPayrollPeriodDetail(req.user.company_id, Number(req.params.id));
    res.json(result);
  } catch (error) {
    res.status(404).json({ result: false, message: error.message });
  }
};
