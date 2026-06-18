import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export function exportToCSV(data, filename) {
  if (!data?.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportToExcel(data, filename, sheetName = 'Report') {
  if (!data?.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buf], { type: 'application/octet-stream' }),
    `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`
  );
}
