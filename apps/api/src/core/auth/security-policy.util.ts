export const ADMIN_ROLES = ['admin_desa', 'operator_desa', 'superadmin_system'] as const;

export const SECURITY_REQUIRE_2FA_ADMIN_KEY = 'security.require_2fa_admin';

export function isAdminRole(roles: string[]): boolean {
  return roles.some((role) => (ADMIN_ROLES as readonly string[]).includes(role));
}

export function parseRequire2FaAdminSetting(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (value && typeof value === 'object' && 'enabled' in value) {
    return Boolean((value as { enabled?: boolean }).enabled);
  }
  return false;
}
