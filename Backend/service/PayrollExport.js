import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import {
  listPayrolls,
  listPeriods,
  findPeriodById,
  getMonthlySummary,
} from "../repository/Payroll.js";
import { toNumber, formatMonthYear } from "./PayrollCalculation.js";
import prisma from "../lib/prisma.js";

const EXPORT_DIR = path.join(process.cwd(), "public", "uploads", "exports");

const ensureExportDir = () => {
  if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });
};

const payrollRows = (payrolls) =>
  payrolls.map((p) => ({
    employee: `${p.employee.first_name} ${p.employee.last_name}`,
    period: p.payrollperiod?.name,
    base_salary: toNumber(p.base_salary),
    allowance: toNumber(p.allowance),
    overtime: toNumber(p.overtime),
    bonus: toNumber(p.bonus),
    deduction: toNumber(p.deduction),
    tax: toNumber(p.tax),
    gross_salary: toNumber(p.gross_salary),
    net_salary: toNumber(p.net_salary),
    status: p.status,
  }));

export const exportPayrollExcel = async (companyId, options) => {
  ensureExportDir();
  const { payroll_period_id, year, report_type } = options;

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const companyName = company?.name || "HR MANAGEMENT SYSTEM";

  let payrolls = [];
  let title = "Payroll Summary Report";

  if (report_type === "monthly" && payroll_period_id) {
    const period = await findPeriodById(payroll_period_id, companyId);
    payrolls = period?.payroll || [];
    title = `Monthly Payroll Report - ${period?.name || ""}`;
  } else if (report_type === "history") {
    payrolls = await listPayrolls(companyId, { payroll_period_id });
    title = "Payroll History Report";
  } else {
    payrolls = await listPayrolls(companyId, payroll_period_id ? { payroll_period_id } : {});
    if (year) {
      const periods = await listPeriods(companyId, { year });
      const periodIds = periods.map((p) => p.id);
      payrolls = payrolls.filter((p) => periodIds.includes(p.payroll_period_id));
    }
    title = `Payroll Summary Report (${year || "All Years"})`;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Payroll Report");

  // 1. Company Header & Title Block (Matching PDF Theme)
  const titleRow = sheet.addRow([companyName.toUpperCase()]);
  titleRow.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FF0F172A" } };
  sheet.mergeCells(1, 1, 1, 11);

  const subtitleRow = sheet.addRow([title]);
  subtitleRow.font = { name: "Calibri", size: 13, bold: true, color: { argb: "FF1E293B" } };
  sheet.mergeCells(2, 1, 2, 11);

  const metaRow = sheet.addRow([
    `Export Date: ${new Date().toISOString().split("T")[0]} | Total Records: ${payrolls.length}`,
  ]);
  metaRow.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF64748B" } };
  sheet.mergeCells(3, 1, 3, 11);

  sheet.addRow([]); // Blank spacer row (Row 4)

  // 2. Table Headers (Dark Slate #1E293B, White bold text)
  const headers = [
    "Employee Name",
    "Period",
    "Base Salary",
    "Allowance",
    "Overtime",
    "Bonus",
    "Deduction",
    "Tax",
    "Gross Salary",
    "Net Salary",
    "Status",
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.height = 28;
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" }, // Dark Slate background
    };
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" }, // Bold white text
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: colNumber >= 3 && colNumber <= 10 ? "right" : colNumber === 11 ? "center" : "left",
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF334155" } },
      left: { style: "thin", color: { argb: "FF334155" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      right: { style: "thin", color: { argb: "FF334155" } },
    };
  });

  let totalBase = 0, totalAllowance = 0, totalOT = 0, totalBonus = 0, totalDeduction = 0, totalTax = 0, totalGross = 0, totalNet = 0;

  // 3. Data Rows
  payrolls.forEach((p, idx) => {
    const empName = p.employee ? `${p.employee.first_name} ${p.employee.last_name}` : "N/A";
    const periodName = p.payrollperiod?.name || "-";
    const base = toNumber(p.base_salary);
    const allowance = toNumber(p.allowance);
    const ot = toNumber(p.overtime);
    const bonus = toNumber(p.bonus);
    const ded = toNumber(p.deduction);
    const tax = toNumber(p.tax);
    const gross = toNumber(p.gross_salary);
    const net = toNumber(p.net_salary);
    const status = (p.status || "draft").toUpperCase();

    totalBase += base;
    totalAllowance += allowance;
    totalOT += ot;
    totalBonus += bonus;
    totalDeduction += ded;
    totalTax += tax;
    totalGross += gross;
    totalNet += net;

    const row = sheet.addRow([
      empName,
      periodName,
      base,
      allowance,
      ot,
      bonus,
      ded,
      tax,
      gross,
      net,
      status,
    ]);

    row.height = 22;
    const isEven = idx % 2 === 0;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Calibri", size: 10.5 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" }, // Soft zebra striping
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (colNumber >= 3 && colNumber <= 10) {
        cell.numFmt = '"$"#,##0.00';
        cell.alignment = { vertical: "middle", horizontal: "right" };
      } else if (colNumber === 11) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = {
          name: "Calibri",
          size: 10,
          bold: true,
          color: { argb: status === "PAID" ? "FF166534" : "FF9A3412" },
        };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }
    });
  });

  // 4. Totals Summary Row
  const totalRow = sheet.addRow([
    "TOTAL SUMMARY",
    "",
    totalBase,
    totalAllowance,
    totalOT,
    totalBonus,
    totalDeduction,
    totalTax,
    totalGross,
    totalNet,
    "",
  ]);

  totalRow.height = 25;
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF0F172A" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF0F172A" } },
      bottom: { style: "double", color: { argb: "FF0F172A" } },
    };
    if (colNumber >= 3 && colNumber <= 10) {
      cell.numFmt = '"$"#,##0.00';
      cell.alignment = { vertical: "middle", horizontal: "right" };
    } else {
      cell.alignment = { vertical: "middle", horizontal: "left" };
    }
  });

  // 5. Auto-fit Column Widths
  sheet.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const valStr = cell.value ? cell.value.toString() : "";
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    col.width = Math.min(maxLen + 4, 35);
  });

  const fileName = `payroll_${report_type}_${Date.now()}.xlsx`;
  const filePath = path.join(EXPORT_DIR, fileName);
  await workbook.xlsx.writeFile(filePath);

  return {
    filePath,
    downloadUrl: `/uploads/exports/${fileName}`,
    fileName,
  };
};

export const exportPayrollPdf = async (companyId, options) => {
  ensureExportDir();
  const { payroll_period_id, year, report_type } = options;

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const companyName = company?.name || "Company HR System";

  let payrolls = [];
  let title = "Payroll Summary Report";

  if (report_type === "monthly" && payroll_period_id) {
    const period = await findPeriodById(payroll_period_id, companyId);
    payrolls = period?.payroll || [];
    title = `Monthly Payroll - ${period?.name || ""}`;
  } else if (report_type === "history") {
    payrolls = await listPayrolls(companyId, {});
    title = "Payroll History Report";
  } else {
    payrolls = await listPayrolls(companyId, payroll_period_id ? { payroll_period_id } : {});
    if (year) {
      const summary = await getMonthlySummary(companyId, year);
      payrolls = summary;
    }
    title = "Payroll Summary Report";
  }

  const rows = payrollRows(payrolls);
  const fileName = `payroll_${report_type}_${Date.now()}.pdf`;
  const filePath = path.join(EXPORT_DIR, fileName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 40, bottom: 20, left: 40, right: 40 },
      bufferPages: true
    });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const drawRow = (y, texts, isHeader = false, isTotal = false) => {
      // Adjusted widths to give Status more space (45 -> 55) and slightly reduce others
      const colWidths = [120, 70, 65, 60, 60, 60, 65, 55, 70, 75, 55];
      const aligns = ["left", "left", "right", "right", "right", "right", "right", "right", "right", "right", "center"];
      
      let startX = 40;
      doc.fontSize(isHeader || isTotal ? 10 : 9).font(isHeader || isTotal ? "Helvetica-Bold" : "Helvetica");
      
      texts.forEach((text, i) => {
        doc.text(text, startX + 2, y + 8, {
          width: colWidths[i] - 4,
          align: aligns[i],
          lineBreak: false
        });
        
        // Vertical lines
        doc.moveTo(startX, y).lineTo(startX, y + 25).stroke("#000000");
        startX += colWidths[i];
      });
      // Last vertical line
      doc.moveTo(startX, y).lineTo(startX, y + 25).stroke("#000000");
      
      // Bottom horizontal line
      doc.moveTo(40, y + 25).lineTo(795, y + 25).stroke("#000000");
    };

    const drawHeader = () => {
      // Cambodia Official Header
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000")
         .text("KINGDOM OF CAMBODIA", 0, 30, { align: "center", width: 841.89 });
      doc.font("Helvetica").fontSize(11)
         .text("NATION RELIGION KING", 0, 45, { align: "center", width: 841.89 });

      // Draw traditional underline for Nation Religion King
      doc.moveTo(380, 58).lineTo(461, 58).stroke("#000000");

      // Company Logo and Details
      let logoPath = null;
      if (company?.logo_path) {
        logoPath = path.join(process.cwd(), "public", company.logo_path);
      }
      if (!logoPath || !fs.existsSync(logoPath)) {
        logoPath = path.join(process.cwd(), "..", "mobile-app-hr", "assets", "bayon.png");
      }

      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 30, { width: 50 });
      }
      
      doc.font("Helvetica-Bold").fontSize(11).text(companyName, 100, 35);
      doc.font("Helvetica").fontSize(9).text(`Generated: ${new Date().toLocaleDateString()}`, 100, 50);
      
      doc.moveDown(4);

      doc.font("Helvetica-Bold").fontSize(14).text(title, 0, 90, { align: "center", width: 841.89 });

      const tableTop = 120;
      // Top line of the table
      doc.moveTo(40, tableTop).lineTo(795, tableTop).stroke("#000000");
      
      drawRow(tableTop, ["Employee", "Period", "Base Salary", "Allowance", "Overtime", "Bonus", "Deduction", "Tax", "Gross", "Net", "Status"], true);
      
      return tableTop + 25;
    };

    let currentY = drawHeader();

    let totalGross = 0;
    let totalNet = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      if (currentY > 520) {
        doc.addPage();
        currentY = drawHeader();
      }

      drawRow(currentY, [
        row.employee,
        row.period || "-",
        `$${row.base_salary.toFixed(2)}`,
        `$${row.allowance.toFixed(2)}`,
        `$${row.overtime.toFixed(2)}`,
        `$${row.bonus.toFixed(2)}`,
        `$${row.deduction.toFixed(2)}`,
        `$${row.tax.toFixed(2)}`,
        `$${row.gross_salary.toFixed(2)}`,
        `$${row.net_salary.toFixed(2)}`,
        row.status.charAt(0).toUpperCase() + row.status.slice(1)
      ]);

      totalGross += row.gross_salary;
      totalNet += row.net_salary;

      currentY += 25;
    }

    if (currentY > 520) {
        doc.addPage();
        currentY = drawHeader();
      }
    
    drawRow(currentY, [
      "TOTAL",
      "", "", "", "", "", "", "",
      `$${totalGross.toFixed(2)}`,
      `$${totalNet.toFixed(2)}`,
      ""
    ], false, true);

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor("#000000").text(
        `Page ${i + 1} of ${pages.count}`,
        40,
        560,
        { align: "center", width: 760 }
      );
    }

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return {
    filePath,
    downloadUrl: `/uploads/exports/${fileName}`,
    fileName,
  };
};
