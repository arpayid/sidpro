export const REGENCY_ADMIN_ROLE = 'admin_kabupaten';

export const TENANT_LEVELS = ['kabupaten', 'kecamatan', 'desa'] as const;

export type TenantLevel = (typeof TENANT_LEVELS)[number];

export function isRegencyAdmin(roles: string[]): boolean {
  return roles.includes(REGENCY_ADMIN_ROLE);
}

export interface TenantScopeContext {
  tenantId: string | null;
  roles: string[];
}

export function assertRegencyScope(context: TenantScopeContext): string {
  if (!context.tenantId) {
    throw new Error('Tenant scope required');
  }
  if (!isRegencyAdmin(context.roles)) {
    throw new Error('Regency admin role required');
  }
  return context.tenantId;
}
