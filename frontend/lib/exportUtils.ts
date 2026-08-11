/**
 * Universal Data Export Utilities (CSV/Excel & PDF)
 */

export interface ExportColumn {
  header: string;
  key: string;
}

/**
 * Export data array to CSV / Excel file
 */
export function exportToCSV(filename: string, columns: ExportColumn[], rows: Record<string, any>[], title: string = "Data Report") {
  if (!rows || rows.length === 0) return;

  const exportDate = new Date().toISOString().split("T")[0];
  const colCount = columns.length;

  const headerCells = columns
    .map(
      (c) =>
        `<th style="background-color: #1e293b; color: #ffffff; font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; padding: 10px 14px; border: 1px solid #334155; text-align: left;">${c.header}</th>`
    )
    .join("");

  const dataRows = rows
    .map((row, idx) => {
      const bgColor = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
      const cells = columns
        .map((col) => {
          const val = row[col.key] ?? "";
          let align = "left";

          if (typeof val === "number" || (!isNaN(Number(val)) && val !== "" && !String(val).startsWith("0"))) {
            align = "right";
          }

          return `<td style="background-color: ${bgColor}; font-family: Arial, sans-serif; font-size: 10pt; padding: 8px 12px; border: 1px solid #cbd5e1; text-align: ${align};">${String(val).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const excelTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${title}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body style="font-family: Arial, sans-serif;">
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td colspan="${colCount}" style="font-size: 16pt; font-weight: bold; color: #0f172a; padding: 10px 0 4px 0;">HR MANAGEMENT SYSTEM</td>
          </tr>
          <tr>
            <td colspan="${colCount}" style="font-size: 13pt; font-weight: bold; color: #1e293b; padding-bottom: 4px;">${title}</td>
          </tr>
          <tr>
            <td colspan="${colCount}" style="font-size: 9.5pt; italic: true; color: #64748b; padding-bottom: 12px;">Export Date: ${exportDate} | Total Records: ${rows.length}</td>
          </tr>
          <tr><td colspan="${colCount}" style="height: 10px;"></td></tr>
          <thead>
            <tr>${headerCells}</tr>
          </thead>
          <tbody>
            ${dataRows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(["\uFEFF" + excelTemplate], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${exportDate}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Open a styled, print-ready PDF window
 */
export function printTablePDF(title: string, columns: ExportColumn[], rows: Record<string, any>[]) {
  const printWin = window.open("", "_blank", "width=900,height=700");
  if (!printWin) return;

  const tableHeaders = columns.map(c => `<th style="padding: 10px; border: 1px solid #e5e7eb; background-color: #f8fafc; font-size: 11px; text-transform: uppercase; text-align: left;">${c.header}</th>`).join("");
  const tableRows = rows.map(row => {
    const cells = columns.map(col => `<td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 12px;">${row[col.key] ?? ""}</td>`).join("");
    return `<tr style="border-bottom: 1px solid #f1f5f9;">${cells}</tr>`;
  }).join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} Report</title>
        <style>
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0071E3; padding-bottom: 16px; margin-bottom: 20px; }
          .logo { font-size: 22px; font-weight: 800; color: #0071E3; letter-spacing: -0.5px; }
          .meta { font-size: 12px; color: #64748b; text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">HR MANAGEMENT SYSTEM</div>
            <h2 style="margin: 4px 0 0 0; font-size: 18px;">${title} Report</h2>
          </div>
          <div class="meta">
            <div>Generated: ${new Date().toLocaleString()}</div>
            <div>Total Records: ${rows.length}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWin.document.write(html);
  printWin.document.close();
}
