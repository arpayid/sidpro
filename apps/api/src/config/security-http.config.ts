type HeaderTarget = {
  setHeader(name: string, value: string): void;
};

export const API_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Permitted-Cross-Domain-Policies': 'none',
};

export function applyApiSecurityHeaders(response: HeaderTarget): void {
  for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) {
    response.setHeader(name, value);
  }
}
