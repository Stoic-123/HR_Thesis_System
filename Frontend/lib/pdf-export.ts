export interface ExportPdfOptions {
  titleKh: string;
  titleEn: string;
  companyName: string;
  companyLogo?: string;
  orientation?: "portrait" | "landscape";
  metadata: { labelKh: string; labelEn: string; value: string }[];
  summary?: { labelKh: string; labelEn: string; value: string }[];
  tableHeaders: { kh: string; en: string; align?: "left" | "center" | "right" }[];
  tableRows: { cells: { text: string; className?: string; align?: "left" | "center" | "right" }[] }[];
  preparedBy?: string;
}

export const exportReportToPDF = (options: ExportPdfOptions) => {
  const { titleKh, titleEn, companyName, companyLogo, orientation, metadata, summary, tableHeaders, tableRows, preparedBy } = options;

  const originalTitle = document.title;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
  const cleanTitleEn = titleEn.replace(/[^a-zA-Z0-9\s-_]/g, "").replace(/\s+/g, "_");
  const formattedTitle = `${cleanTitleEn}_${timestamp}`;

  // Temporarily set the main document title so browser print uses it as the default filename
  document.title = formattedTitle;

  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0px";
  iframe.style.height = "0px";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.error("Could not write to print iframe");
    document.title = originalTitle;
    return;
  }

  // Build metadata HTML
  const metadataHtml = metadata
    .map(
      (m) => `
    <div class="meta-item">
      <span class="meta-label">${m.labelKh} / ${m.labelEn}:</span>
      <span class="meta-val">${m.value}</span>
    </div>
  `
    )
    .join("");

  // Build summary HTML
  let summaryHtml = "";
  if (summary && summary.length > 0) {
    summaryHtml = `
      <div class="summary-section">
        ${summary
          .map(
            (s) => `
          <div class="summary-card">
            <div class="summary-title">${s.labelKh} / ${s.labelEn}</div>
            <div class="summary-value">${s.value}</div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  // Build table headers
  const headersHtml = tableHeaders
    .map(
      (h) => `
    <th style="text-align: ${h.align || "left"}">
      <div class="th-kh">${h.kh}</div>
      <div class="th-en">${h.en}</div>
    </th>
  `
    )
    .join("");

  // Build table rows
  const rowsHtml = tableRows
    .map(
      (r) => `
    <tr>
      ${r.cells
        .map(
          (c) => `
        <td class="${c.className || ""}" style="text-align: ${c.align || "left"}">
          ${c.text}
        </td>
      `
        )
        .join("")}
    </tr>
  `
    )
    .join("");

  // Get current date formatted in Khmer/English for signature
  const today = new Date();
  const formatOptions: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };
  const dateKh = today.toLocaleDateString("km-KH", formatOptions);
  const dateEn = today.toLocaleDateString("en-US", formatOptions);

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${formattedTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;500;600;700&family=Moul&display=swap');
          
          @page {
            size: A4 ${orientation || "landscape"};
            margin: 0;
          }

          body {
            font-family: 'Kantumruy Pro', Arial, sans-serif;
            color: #1f2937;
            background: #ffffff;
            font-size: 10pt;
            line-height: 1.5;
            margin: 0;
            padding: 0;
          }

          .print-layout-table {
            width: 100%;
            border-collapse: collapse;
          }

          .print-page-header-space {
            height: 1.5cm;
          }

          .print-page-footer-space {
            height: 1.5cm;
          }

          .print-layout-table > tbody > tr > td {
            padding: 0 1.5cm;
          }

          /* National Motto Header */
          .national-header {
            text-align: center;
            margin-bottom: 20px;
            float: right;
            width: 50%;
          }
          .national-motto-kh {
            font-family: 'Moul', serif;
            font-size: 11pt;
            letter-spacing: 0.5px;
            margin: 0;
            text-align: center;
          }
          .national-motto-en {
            font-family: 'Kantumruy Pro', sans-serif;
            font-weight: 600;
            font-size: 9pt;
            text-transform: uppercase;
            margin: 2px 0 5px 0;
            text-align: center;
          }
          .motto-divider {
            width: 100px;
            height: 1px;
            border-bottom: 1px double #4b5563;
            margin: 0 auto;
          }

          /* Company Header */
          .company-header {
            float: left;
            width: 50%;
            margin-bottom: 20px;
          }
          .company-name {
            font-weight: 700;
            font-size: 11pt;
            color: #111827;
            margin: 0;
          }
          .company-sub {
            font-size: 8pt;
            color: #6b7280;
            margin: 2px 0 0 0;
          }

          .header-container {
            width: 100%;
            height: 80px;
            margin-bottom: 30px;
            border-bottom: 2px solid #e5e7eb;
          }

          .clear {
            clear: both;
          }

          /* Report Title */
          .report-title-container {
            text-align: center;
            margin-bottom: 25px;
          }
          .report-title-kh {
            font-family: 'Moul', serif;
            font-size: 14pt;
            color: #111827;
            margin: 0 0 5px 0;
          }
          .report-title-en {
            font-weight: 700;
            font-size: 11pt;
            color: #4b5563;
            text-transform: uppercase;
            margin: 0;
          }

          /* Metadata Grid */
          .meta-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 25px;
            padding: 12px 18px;
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          }
          .meta-item {
            font-size: 9pt;
          }
          .meta-label {
            color: #6b7280;
            font-weight: 500;
          }
          .meta-val {
            color: #111827;
            font-weight: 600;
            margin-left: 5px;
          }

          /* Summary Statistics Cards */
          .summary-section {
            display: grid;
            grid-template-columns: repeat(${summary ? summary.length : 3}, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .summary-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            background-color: #ffffff;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
          }
          .summary-title {
            font-size: 8pt;
            color: #6b7280;
            font-weight: 500;
            margin-bottom: 5px;
            text-transform: uppercase;
          }
          .summary-value {
            font-size: 16pt;
            font-weight: 700;
            color: #111827;
          }

          /* Table Design */
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
            page-break-inside: auto;
          }
          .data-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          .data-table thead {
            display: table-header-group;
          }
          .data-table th {
            background-color: #f3f4f6;
            border: 1px solid #e5e7eb;
            padding: 8px 10px;
            color: #374151;
            font-weight: 600;
          }
          .th-kh {
            font-size: 8.5pt;
            font-family: 'Kantumruy Pro', sans-serif;
            font-weight: 700;
          }
          .th-en {
            font-size: 7.5pt;
            color: #6b7280;
            text-transform: uppercase;
            margin-top: 1px;
          }
          .data-table td {
            border: 1px solid #e5e7eb;
            padding: 8px 10px;
            font-size: 9pt;
            vertical-align: middle;
          }
          
          /* Status Helpers */
          .text-emerald { color: #10b981; font-weight: 600; }
          .text-amber { color: #f59e0b; font-weight: 600; }
          .text-rose { color: #ef4444; font-weight: 600; }
          .text-gray { color: #6b7280; }
          .font-mono { font-family: monospace, sans-serif; font-size: 9.5pt; }
        </style>
      </head>
      <body>
        <table class="print-layout-table">
          <thead>
            <tr>
              <td>
                <div class="print-page-header-space"></div>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <!-- Header -->
                <div class="header-container">
                  <div class="company-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      ${companyLogo ? `<img src="${companyLogo}" alt="Logo" style="height: 45px; width: 45px; object-fit: contain;" />` : ""}
                      <div>
                        <h2 class="company-name">${companyName}</h2>
                        <p class="company-sub">ប្រព័ន្ធគ្រប់គ្រងធនធានមនុស្ស / HR Management System</p>
                      </div>
                    </div>
                  </div>
                  
                  <div class="national-header">
                    <h1 class="national-motto-kh">ព្រះរាជាណាចក្រកម្ពុជា</h1>
                    <h2 class="national-motto-en">Kingdom of Cambodia</h2>
                    <h3 class="national-motto-kh" style="font-size: 9pt; margin-top: 2px;">ជាតិ សាសនា ព្រះមហាក្សត្រ</h3>
                    <div class="motto-divider"></div>
                  </div>
                  <div class="clear"></div>
                </div>

                <!-- Title -->
                <div class="report-title-container">
                  <h2 class="report-title-kh">${titleKh}</h2>
                  <p class="report-title-en">${titleEn}</p>
                </div>

                <!-- Metadata Section -->
                <div class="meta-section">
                  ${metadataHtml}
                </div>

                <!-- Summary Section -->
                ${summaryHtml}

                <!-- Data Table -->
                <table class="data-table">
                  <thead>
                    <tr>
                      ${headersHtml}
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>
                <div class="print-page-footer-space"></div>
              </td>
            </tr>
          </tfoot>
        </table>

        <script>
          window.onload = function() {
            setTimeout(() => {
              window.print();
              setTimeout(() => {
                window.parent.document.title = ${JSON.stringify(originalTitle)};
                window.parent.document.body.removeChild(window.frameElement);
              }, 500);
            }, 500);
          }
        </script>
      </body>
    </html>
  `);
  doc.close();
};

export interface ExportPayslipOptions {
  payroll: any;
  companyName: string;
  companyLogo?: string;
}

export const exportPayslipToPDF = (options: ExportPayslipOptions) => {
  const { payroll, companyName, companyLogo } = options;
  const employee = payroll.employee;
  const period = payroll.payrollperiod;

  const originalTitle = document.title;
  const formattedTitle = `Payslip_${employee?.first_name}_${employee?.last_name}_${period?.name || ""}`;
  document.title = formattedTitle;

  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0px";
  iframe.style.height = "0px";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.error("Could not write to print iframe");
    document.title = originalTitle;
    return;
  }

  const formatMoney = (value: number) => `$${value.toFixed(2)}`;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${formattedTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;500;600;700&family=Moul&display=swap');
          
          @page {
            size: A4 portrait;
            margin: 0;
          }

          body {
            font-family: 'Kantumruy Pro', Arial, sans-serif;
            color: #1f2937;
            background: #ffffff;
            font-size: 10pt;
            line-height: 1.5;
            margin: 0;
            padding: 1.5cm;
          }

          /* National Motto Header */
          .national-header {
            text-align: center;
            margin-bottom: 20px;
            float: right;
            width: 50%;
          }
          .national-motto-kh {
            font-family: 'Moul', serif;
            font-size: 11pt;
            letter-spacing: 0.5px;
            margin: 0;
            text-align: center;
          }
          .national-motto-en {
            font-family: 'Kantumruy Pro', sans-serif;
            font-weight: 600;
            font-size: 9pt;
            text-transform: uppercase;
            margin: 2px 0 5px 0;
            text-align: center;
          }
          .motto-divider {
            width: 100px;
            height: 1px;
            border-bottom: 1px double #4b5563;
            margin: 0 auto;
          }

          /* Company Header */
          .company-header {
            float: left;
            width: 50%;
            margin-bottom: 20px;
          }
          .company-name {
            font-weight: 700;
            font-size: 11pt;
            color: #111827;
            margin: 0;
          }
          .company-sub {
            font-size: 8pt;
            color: #6b7280;
            margin: 2px 0 0 0;
          }

          .header-container {
            width: 100%;
            height: 80px;
            margin-bottom: 30px;
            border-bottom: 2px solid #e5e7eb;
          }

          .clear {
            clear: both;
          }

          /* Report Title */
          .report-title-container {
            text-align: center;
            margin-bottom: 25px;
          }
          .report-title-kh {
            font-family: 'Moul', serif;
            font-size: 14pt;
            color: #111827;
            margin: 0 0 5px 0;
          }
          .report-title-en {
            font-weight: 700;
            font-size: 11pt;
            color: #4b5563;
            text-transform: uppercase;
            margin: 0;
          }

          /* Metadata Grid */
          .meta-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 25px;
            padding: 15px 20px;
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
          }
          .meta-item {
            font-size: 9.5pt;
          }
          .meta-label {
            color: #6b7280;
            font-weight: 500;
          }
          .meta-val {
            color: #111827;
            font-weight: 600;
            margin-left: 5px;
          }

          /* Table Design */
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .data-table th {
            background-color: #f3f4f6;
            border: 1px solid #e5e7eb;
            padding: 10px 14px;
            color: #374151;
            font-weight: 600;
          }
          .th-kh {
            font-size: 9pt;
            font-family: 'Kantumruy Pro', sans-serif;
            font-weight: 700;
          }
          .th-en {
            font-size: 8pt;
            color: #6b7280;
            text-transform: uppercase;
            margin-top: 1px;
          }
          .data-table td {
            border: 1px solid #e5e7eb;
            padding: 10px 14px;
            font-size: 9.5pt;
            vertical-align: middle;
          }
          
          /* Net Salary Highlight */
          .net-salary-card {
            background: #f9fafb;
            border-left: 4px solid #0071e3;
            padding: 18px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 8px;
            margin-top: 25px;
            border: 1px solid #e5e7eb;
            border-left-width: 4px;
          }
          .net-label-kh {
            font-weight: 700;
            font-size: 11pt;
            color: #111827;
          }
          .net-label-en {
            font-size: 8.5pt;
            color: #6b7280;
            text-transform: uppercase;
            margin-top: 2px;
          }
          .net-value {
            font-weight: 700;
            font-size: 18pt;
            color: #0071e3;
          }

          .footer-text {
            font-size: 8pt;
            color: #9ca3af;
            text-align: center;
            margin-top: 60px;
            border-top: 1px solid #f3f4f6;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header-container">
          <div class="company-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              ${companyLogo ? `<img src="${companyLogo}" alt="Logo" style="height: 45px; width: 45px; object-fit: contain;" />` : ""}
              <div>
                <h2 class="company-name">${companyName}</h2>
                <p class="company-sub">ប្រព័ន្ធគ្រប់គ្រងធនធានមនុស្ស / HR Management System</p>
              </div>
            </div>
          </div>
          
          <div class="national-header">
            <h1 class="national-motto-kh">ព្រះរាជាណាចក្រកម្ពុជា</h1>
            <h2 class="national-motto-en">Kingdom of Cambodia</h2>
            <h3 class="national-motto-kh" style="font-size: 9pt; margin-top: 2px;">ជាតិ សាសនា ព្រះមហាក្សត្រ</h3>
            <div class="motto-divider"></div>
          </div>
          <div class="clear"></div>
        </div>

        <!-- Title -->
        <div class="report-title-container">
          <h2 class="report-title-kh">ប័ណ្ណបើកប្រាក់បៀវត្សរ៍</h2>
          <p class="report-title-en">PAYSLIP</p>
        </div>

        <!-- Employee Metadata Grid -->
        <div class="meta-section">
          <div class="meta-item">
            <span class="meta-label">ឈ្មោះបុគ្គលិក / Employee Name:</span>
            <span class="meta-val">${employee?.first_name} ${employee?.last_name}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">គ្រាកាល / Period:</span>
            <span class="meta-val">${period?.name || "-"}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">តួនាទី / Position:</span>
            <span class="meta-val">${employee?.positions?.name || "N/A"}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">ថ្ងៃបើកប្រាក់ / Pay Date:</span>
            <span class="meta-val">${period?.pay_date ? new Date(period.pay_date).toLocaleDateString() : "-"}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">ផ្នែក / Department:</span>
            <span class="meta-val">${employee?.department_employee_department_idTodepartment?.name || "N/A"}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">ស្ថានភាព / Status:</span>
            <span class="meta-val" style="color: ${payroll.status === "paid" ? "#10b981" : "#f59e0b"}; text-transform: uppercase;">
              ${payroll.status}
            </span>
          </div>
        </div>

        <!-- Breakdown Table -->
        <table class="data-table">
          <thead>
            <tr>
              <th style="text-align: left;">
                <div class="th-kh">ការពណ៌នា</div>
                <div class="th-en">Description</div>
              </th>
              <th style="text-align: right; width: 200px;">
                <div class="th-kh">ចំនូនទឹកប្រាក់</div>
                <div class="th-en">Amount</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ប្រាក់ខែគោល / Base Salary</td>
              <td style="text-align: right; font-weight: 600;">${formatMoney(payroll.base_salary)}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td>ប្រាក់ឧបត្ថម្ភ / Allowance</td>
              <td style="text-align: right; font-weight: 600;">${formatMoney(payroll.allowance)}</td>
            </tr>
            <tr>
              <td>ម៉ោងបន្ថែម / Overtime</td>
              <td style="text-align: right; font-weight: 600;">${formatMoney(payroll.overtime)}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td>ប្រាក់លើកទឹកចិត្ត / Bonus</td>
              <td style="text-align: right; font-weight: 600;">${formatMoney(payroll.bonus)}</td>
            </tr>
            <tr style="font-weight: 700; background-color: #f3f4f6;">
              <td>ប្រាក់ខែសរុប / Gross Salary</td>
              <td style="text-align: right;">${formatMoney(payroll.gross_salary)}</td>
            </tr>
            <tr>
              <td>ការកាត់ប្រាក់ / Deduction</td>
              <td style="text-align: right; color: #ef4444; font-weight: 600;">-${formatMoney(payroll.deduction)}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td>ពន្ធ / Tax</td>
              <td style="text-align: right; color: #ef4444; font-weight: 600;">-${formatMoney(payroll.tax)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Net Salary Card -->
        <div class="net-salary-card">
          <div>
            <div class="net-label-kh">ប្រាក់ខែសុទ្ធ</div>
            <div class="net-label-en">NET SALARY</div>
          </div>
          <div class="net-value">${formatMoney(payroll.net_salary)}</div>
        </div>

        <!-- Footer Notice -->
        <div class="footer-text">
          ឯកសារនេះត្រូវបានបង្កើតឡើងដោយប្រព័ន្ធកុំព្យូទ័រ មិនចាំបាច់មានហត្ថលេខាឡើយ។<br/>
          This is a computer-generated document. No signature is required.
        </div>

        <script>
          window.onload = function() {
            setTimeout(() => {
              window.print();
              setTimeout(() => {
                window.parent.document.title = ${JSON.stringify(originalTitle)};
                window.parent.document.body.removeChild(window.frameElement);
              }, 500);
            }, 500);
          }
        </script>
      </body>
    </html>
  `);
  doc.close();
};
