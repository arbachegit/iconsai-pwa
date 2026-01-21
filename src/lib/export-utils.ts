import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf';

interface ExportOptions {
  filename: string;
  data: any[];
  format: ExportFormat;
  columns?: { key: string; label: string }[];
}

export const exportData = async ({ filename, data, format, columns }: ExportOptions) => {
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${timestamp}`;

  switch (format) {
    case 'csv':
      exportToCSV(fullFilename, data, columns);
      break;
    case 'xlsx':
      exportToExcel(fullFilename, data, columns);
      break;
    case 'json':
      exportToJSON(fullFilename, data);
      break;
    case 'pdf':
      await exportToPDF(fullFilename, data, columns);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};

const exportToCSV = (filename: string, data: any[], columns?: { key: string; label: string }[]) => {
  const headers = columns ? columns.map(col => col.label) : Object.keys(data[0] || {});
  const keys = columns ? columns.map(col => col.key) : Object.keys(data[0] || {});

  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      keys.map(key => {
        const value = row[key];
        const stringValue = value === null || value === undefined ? '' : String(value);
        return `"${stringValue.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
};

const exportToExcel = (filename: string, data: any[], columns?: { key: string; label: string }[]) => {
  const worksheet = columns 
    ? XLSX.utils.json_to_sheet(
        data.map(row => {
          const newRow: any = {};
          columns.forEach(col => {
            newRow[col.label] = row[col.key];
          });
          return newRow;
        })
      )
    : XLSX.utils.json_to_sheet(data);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

const exportToJSON = (filename: string, data: any[]) => {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, 'application/json');
};

const exportToPDF = async (filename: string, data: any[], columns?: { key: string; label: string }[]) => {
  const pdf = new jsPDF();
  const headers = columns ? columns.map(col => col.label) : Object.keys(data[0] || {});
  const keys = columns ? columns.map(col => col.key) : Object.keys(data[0] || {});

  let y = 20;
  pdf.setFontSize(16);
  pdf.text(filename, 14, y);
  y += 10;

  pdf.setFontSize(10);
  pdf.text(headers.join(' | '), 14, y);
  y += 7;

  data.forEach((row, index) => {
    if (y > 270) {
      pdf.addPage();
      y = 20;
    }
    
    const rowText = keys.map(key => {
      const value = row[key];
      return value === null || value === undefined ? '' : String(value).substring(0, 20);
    }).join(' | ');
    
    pdf.text(rowText, 14, y);
    y += 7;
  });

  pdf.save(`${filename}.pdf`);
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
