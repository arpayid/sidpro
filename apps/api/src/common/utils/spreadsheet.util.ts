import type { Response } from 'express';
import ExcelJS from 'exceljs';

export interface SpreadsheetSheet {
  name: string;
  rows: Record<string, unknown>[];
}

export async function jsonToXlsxBuffer(sheets: SpreadsheetSheet[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    if (!sheet.rows.length) {
      worksheet.addRow([]);
      continue;
    }

    const headers = Object.keys(sheet.rows[0]!);
    worksheet.addRow(headers);
    for (const row of sheet.rows) {
      worksheet.addRow(headers.map((header) => row[header] ?? ''));
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function xlsxBufferToJson(buffer: Buffer): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const headers: string[] = [];
  const rows: Record<string, unknown>[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value ?? '').trim();
      });
      return;
    }

    const record: Record<string, unknown> = {};
    row.eachCell((cell, colNumber) => {
      const key = headers[colNumber - 1];
      if (!key) return;
      record[key] = cell.value ?? '';
    });

    if (Object.keys(record).length > 0) {
      rows.push(record);
    }
  });

  return rows;
}

export async function sendXlsxDownload(
  res: Response,
  sheets: SpreadsheetSheet[],
  filename: string,
): Promise<void> {
  const buffer = await jsonToXlsxBuffer(sheets);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}
