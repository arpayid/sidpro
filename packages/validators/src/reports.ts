import { z } from 'zod';

const reportYearSchema = z
  .coerce
  .number()
  .int('Tahun laporan harus berupa bilangan bulat')
  .min(1900, 'Tahun laporan minimal 1900')
  .max(2200, 'Tahun laporan maksimal 2200');

export const financeReportQuerySchema = z
  .object({
    year: reportYearSchema.optional(),
  })
  .strict();

export const auditReportQuerySchema = z
  .object({
    days: z
      .coerce
      .number()
      .int('Rentang hari harus berupa bilangan bulat')
      .min(1, 'Rentang hari minimal 1')
      .max(365, 'Rentang hari maksimal 365')
      .default(30),
  })
  .strict();
