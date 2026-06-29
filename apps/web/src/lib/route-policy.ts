export const ADMIN_ROUTE_PREFIX = '/admin';

export function isAdminRoute(pathname: string): boolean {
  return pathname === ADMIN_ROUTE_PREFIX || pathname.startsWith(`${ADMIN_ROUTE_PREFIX}/`);
}

export function sanitizeAdminCallback(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return ADMIN_ROUTE_PREFIX;
  }

  try {
    const parsed = new URL(value, 'https://sidpro.invalid');
    if (parsed.origin !== 'https://sidpro.invalid' || !isAdminRoute(parsed.pathname)) {
      return ADMIN_ROUTE_PREFIX;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return ADMIN_ROUTE_PREFIX;
  }
}
