import { z } from 'zod';

const reportYearSchema = z
  .string()
  .trim()
  .regex(/^(?:19\d{2}|20\d{2}|21\d{2}|2200)$/, 'Tahun laporan harus 1900 sampai 2200');

const auditDaysSchema = z
  .string()
  .trim()
  .regex(
    /^(?:[1-9]|[1-9]\d|[12]\d{2}|3(?:[0-5]\d|6[0-5]))$/,
    'Rentang hari harus 1 sampai 365',
  );

export const financeReportQuerySchema = z
  .object({
    year: reportYearSchema.optional(),
  })
  .strict();

export const auditReportQuerySchema = z
  .object({
    days: auditDaysSchema.default('30'),
  })
  .strict();
