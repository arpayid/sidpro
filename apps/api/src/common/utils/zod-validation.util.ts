import { BadRequestException } from '@nestjs/common';
import { z, ZodError, ZodTypeAny } from 'zod';

export type ValidationErrorPayload = {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    fields: Record<string, string[]>;
  };
};

export function formatZodError(error: ZodError): ValidationErrorPayload {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_root';
    fields[key] = [...(fields[key] ?? []), issue.message];
  }

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Payload tidak valid',
      fields,
    },
  };
}

export function parseWithZod<TSchema extends ZodTypeAny>(
  schema: TSchema,
  payload: unknown,
): z.infer<TSchema> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new BadRequestException(formatZodError(parsed.error));
  }
  return parsed.data;
}
