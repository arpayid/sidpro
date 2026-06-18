/** Public portal tenant code (matches seed `demo-desa` by default). */
export function getPublicTenantCode(): string {
  return process.env.NEXT_PUBLIC_TENANT_CODE ?? 'demo-desa';
}
