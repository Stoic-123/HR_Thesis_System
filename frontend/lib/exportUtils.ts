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
export function exportToCSV(filename: string, columns: ExportColumn[], rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;

  const headerRow = columns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(",");
  const dataRows = rows.map(row => {
    return columns.map(col => {
      const val = row[col.key] ?? "";
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(",");
  });

  const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
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
