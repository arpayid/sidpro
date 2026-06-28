import { z } from 'zod';

function decimalIntegerSchema(label: string) {
  return z
    .string()
    .trim()
    .regex(/^\d+$/, `${label} harus berupa bilangan bulat desimal`)
    .transform((value) => Number(value));
}

const reportYearSchema = decimalIntegerSchema('Tahun laporan').pipe(
  z
    .number()
    .int('Tahun laporan harus berupa bilangan bulat')
    .min(1900, 'Tahun laporan minimal 1900')
    .max(2200, 'Tahun laporan maksimal 2200'),
);

const auditDaysSchema = decimalIntegerSchema('Rentang hari').pipe(
  z
    .number()
    .int('Rentang hari harus berupa bilangan bulat')
    .min(1, 'Rentang hari minimal 1')
    .max(365, 'Rentang hari maksimal 365'),
);

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
