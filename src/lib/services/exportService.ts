import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

export function generateCSV(headers: string[], rows: (string | number)[][]): string {
  const allRows = [headers, ...rows];
  return allRows
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replaceAll('"', '""')}"`;
          }
          return str;
        })
        .join(",")
    )
    .join("\r\n");
}

export function generateExcelBuffer(sheetName: string, headers: string[], rows: (string | number)[][]): Buffer {
  const wb = XLSX.utils.book_new();
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function generatePDFDocument(title: string, headers: string[], rows: (string | number)[][]): Buffer {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);

  (doc as any).autoTable({
    startY: 28,
    head: [headers],
    body: rows,
    theme: "striped",
    headStyles: { fillColor: [37, 57, 43] }, // Church Forest Green
  });

  return Buffer.from(doc.output("arraybuffer"));
}

