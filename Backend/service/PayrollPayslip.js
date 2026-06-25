import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { toNumber } from "./PayrollCalculation.js";

const PAYSLIP_DIR = path.join(process.cwd(), "public", "uploads", "payslips");

const ensureDir = () => {
  if (!fs.existsSync(PAYSLIP_DIR)) fs.mkdirSync(PAYSLIP_DIR, { recursive: true });
};

const formatMoney = (value) => `$${toNumber(value).toFixed(2)}`;

export const generatePayslipPdf = async (payroll, company) => {
  ensureDir();
  const employee = payroll.employee;
  const period = payroll.payrollperiod;
  const fileName = `payslip_${payroll.id}_${Date.now()}.pdf`;
  const filePath = path.join(PAYSLIP_DIR, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // --- Colors & Fonts ---
    const primaryColor = "#0071e3";
    const textDark = "#111827";
    const textLight = "#6b7280";
    const bgLight = "#f9fafb";
    
    // --- Header ---
    doc.fontSize(28).fillColor(primaryColor).text("PAYSLIP", 50, 50);
    
    doc.fontSize(10).fillColor(textLight).text("COMPANY NAME", 300, 55, { align: "right" });
    doc.fontSize(14).fillColor(textDark).text(company?.name || "Company", 300, 70, { align: "right" });

    doc.moveTo(50, 105).lineTo(545, 105).lineWidth(1).strokeColor("#e5e7eb").stroke();

    // --- Employee Info ---
    doc.moveDown(1.5);
    const infoTop = 130;
    
    // Column 1
    doc.fontSize(10).fillColor(textLight).text("Employee Name:", 50, infoTop);
    doc.fontSize(11).fillColor(textDark).text(`${employee.first_name} ${employee.last_name}`, 150, infoTop, { bold: true });
    
    doc.fontSize(10).fillColor(textLight).text("Position:", 50, infoTop + 20);
    doc.fontSize(10).fillColor(textDark).text(employee.positions?.name || "N/A", 150, infoTop + 20);

    doc.fontSize(10).fillColor(textLight).text("Department:", 50, infoTop + 40);
    doc.fontSize(10).fillColor(textDark).text(employee.department_employee_department_idTodepartment?.name || "N/A", 150, infoTop + 40);

    // Column 2
    doc.fontSize(10).fillColor(textLight).text("Period:", 300, infoTop);
    doc.fontSize(10).fillColor(textDark).text(period.name, 380, infoTop);

    doc.fontSize(10).fillColor(textLight).text("Pay Date:", 300, infoTop + 20);
    doc.fontSize(10).fillColor(textDark).text(new Date(period.pay_date).toLocaleDateString(), 380, infoTop + 20);

    doc.fontSize(10).fillColor(textLight).text("Status:", 300, infoTop + 40);
    doc.fontSize(10).fillColor(payroll.status === 'paid' ? '#10b981' : '#f59e0b').text(payroll.status.toUpperCase(), 380, infoTop + 40);

    // --- Table Header ---
    const tableTop = 230;
    doc.rect(50, tableTop, 495, 30).fill(primaryColor);
    doc.fontSize(10).fillColor("#ffffff").text("DESCRIPTION", 60, tableTop + 10);
    doc.text("AMOUNT", 400, tableTop + 10, { width: 130, align: "right" });

    // --- Table Rows ---
    const rows = [
      { label: "Base Salary", value: formatMoney(payroll.base_salary), type: "earning" },
      { label: "Allowance", value: formatMoney(payroll.allowance), type: "earning" },
      { label: "Overtime", value: formatMoney(payroll.overtime), type: "earning" },
      { label: "Bonus", value: formatMoney(payroll.bonus), type: "earning" },
      { label: "Gross Salary", value: formatMoney(payroll.gross_salary), type: "subtotal" },
      { label: "Deduction", value: `-${formatMoney(payroll.deduction)}`, type: "deduction" },
      { label: "Tax", value: `-${formatMoney(payroll.tax)}`, type: "deduction" },
    ];

    let y = tableTop + 30;
    rows.forEach((row, i) => {
      // Alternating background
      if (i % 2 === 0) {
        doc.rect(50, y, 495, 30).fill(bgLight);
      }
      
      const isSubtotal = row.type === "subtotal";
      const isDeduction = row.type === "deduction";
      
      doc.fontSize(10)
         .fillColor(isSubtotal ? textDark : textLight)
         .text(row.label, 60, y + 10, { continued: false });
         
      doc.fillColor(isDeduction ? "#ef4444" : textDark)
         .text(row.value, 400, y + 10, { width: 130, align: "right" });
         
      y += 30;
    });

    // --- Net Salary Summary ---
    doc.moveTo(50, y + 10).lineTo(545, y + 10).lineWidth(1).strokeColor("#e5e7eb").stroke();
    
    y += 20;
    doc.rect(300, y, 245, 40).fill(bgLight);
    doc.rect(300, y, 3, 40).fill(primaryColor); // left accent
    
    doc.fontSize(12).fillColor(textDark).text("NET SALARY", 315, y + 14);
    doc.fontSize(14).fillColor(primaryColor).text(formatMoney(payroll.net_salary), 400, y + 13, { width: 130, align: "right" });

    // --- Footer ---
    doc.fontSize(9).fillColor(textLight).text(
      "This is a computer-generated document. No signature is required.",
      50,
      750,
      { align: "center" }
    );

    doc.end();
    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
};
