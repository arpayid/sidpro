import { maskKk, maskNik } from '../../common/utils/response.util';

const SENSITIVE_KEY_PATTERN =
  /password|secret|token|api[_-]?key|authorization|refresh|credential|hash/i;

const NIK_KEY_PATTERN = /^nik$/i;
const KK_KEY_PATTERN = /^(kk|kknumber|kk_number|familycard)$/i;

function maskValueForKey(key: string, value: unknown): unknown {
  if (typeof value === 'string') {
    if (SENSITIVE_KEY_PATTERN.test(key)) return '[REDACTED]';
    if (NIK_KEY_PATTERN.test(key) && value.length === 16) return maskNik(value);
    if (KK_KEY_PATTERN.test(key) && value.length === 16) return maskKk(value);
    if (value.length > 64 && SENSITIVE_KEY_PATTERN.test(value)) return '[REDACTED]';
  }
  return value;
}

export function sanitizeAuditMetadata(metadata: unknown): unknown {
  if (metadata === null || metadata === undefined) return metadata;
  if (Array.isArray(metadata)) {
    return metadata.map((item) => sanitizeAuditMetadata(item));
  }
  if (typeof metadata !== 'object') return metadata;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      result[key] = '[REDACTED]';
      continue;
    }
    if (value !== null && typeof value === 'object') {
      result[key] = sanitizeAuditMetadata(value);
      continue;
    }
    result[key] = maskValueForKey(key, value);
  }
  return result;
}

export interface SanitizedAuditLog {
  id: string;
  tenantId: string | null;
  actorId: string | null;
  action: string;
  module: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: Date;
  actor?: { id: string; name: string; email: string } | null;
}

export function sanitizeAuditLog<T extends SanitizedAuditLog>(log: T): T {
  return {
    ...log,
    metadata: sanitizeAuditMetadata(log.metadata),
  };
}
