import { saveAs } from 'file-saver';

export function exportToCSV(data, filename) {
  if (!data?.length) return;
  const headers = Object.keys(data[0]);
  const encode = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [
    headers.map(encode).join(','),
    ...data.map(row => headers.map(header => encode(
      row[header] && typeof row[header] === 'object' ? JSON.stringify(row[header]) : row[header]
    )).join(',')),
  ].join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
}
