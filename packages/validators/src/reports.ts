import { z } from 'zod';

const reportYearSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'Tahun laporan harus berupa bilangan bulat desimal')
  .transform((value) => Number.parseInt(value, 10))
  .refine((value) => value >= 1900, 'Tahun laporan minimal 1900')
  .refine((value) => value <= 2200, 'Tahun laporan maksimal 2200');

const auditDaysSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'Rentang hari harus berupa bilangan bulat desimal')
  .transform((value) => Number.parseInt(value, 10))
  .refine((value) => value >= 1, 'Rentang hari minimal 1')
  .refine((value) => value <= 365, 'Rentang hari maksimal 365');

export const financeReportQuerySchema = z
  .object({
    year: reportYearSchema.optional(),
  })
  .strict();

export const auditReportQuerySchema = z
  .object({
    days: auditDaysSchema.default(30),
  })
  .strict();
