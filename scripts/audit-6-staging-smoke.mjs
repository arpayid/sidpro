import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const requiredSecurityHeaders = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'x-permitted-cross-domain-policies': 'none',
};

const evidenceHeaderNames = ['content-type', ...Object.keys(requiredSecurityHeaders)];

function normalizeBaseUrl(value, name) {
  if (!value) throw new Error(`${name} is required.`);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`${name} must use http or https.`);
  }
  if (url.username || url.password) {
    throw new Error(`${name} must not include URL credentials.`);
  }
  url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url;
}

function endpoint(base, path) {
  return new URL(path.replace(/^\//, ''), `${base.toString().replace(/\/$/, '')}/`).toString();
}

function headersOf(response) {
  return Object.fromEntries([...response.headers.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function evidenceHeadersOf(headers) {
  return Object.fromEntries(evidenceHeaderNames.map((name) => [name, headers[name] ?? null]));
}

function assertion(name, condition, detail) {
  return { name, passed: Boolean(condition), detail };
}

async function request(url, options = {}) {
  const startedAt = Date.now();
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
    ...options,
  });
  const body = await response.text();
  return {
    url,
    status: response.status,
    durationMs: Date.now() - startedAt,
    headers: headersOf(response),
    body,
  };
}

function securityHeaderAssertions(result) {
  return Object.entries(requiredSecurityHeaders).map(([name, value]) =>
    assertion(
      `header:${name}`,
      result.headers[name]?.toLowerCase() === value.toLowerCase(),
      `expected ${JSON.stringify(value)}, received ${JSON.stringify(result.headers[name] ?? null)}`,
    ),
  );
}

function publicPageAssertions(result, marker) {
  return [
    assertion('http-success', result.status >= 200 && result.status < 300, `status ${result.status}`),
    assertion(
      'content-type-html',
      result.headers['content-type']?.includes('text/html') ?? false,
      `content-type ${JSON.stringify(result.headers['content-type'] ?? null)}`,
    ),
    assertion('expected-marker', result.body.includes(marker), `marker ${JSON.stringify(marker)}`),
    ...securityHeaderAssertions(result),
  ];
}

async function main() {
  const webBase = normalizeBaseUrl(process.env.STAGING_WEB_URL, 'STAGING_WEB_URL');
  const apiBase = process.env.STAGING_API_URL
    ? normalizeBaseUrl(process.env.STAGING_API_URL, 'STAGING_API_URL')
    : null;

  const checks = [];
  const home = await request(endpoint(webBase, '/'));
  checks.push({ id: 'public-home', result: home, assertions: publicPageAssertions(home, 'SIDPRO') });

  const login = await request(endpoint(webBase, '/login'));
  checks.push({ id: 'login-page', result: login, assertions: publicPageAssertions(login, 'Masuk Admin SIDPRO') });

  const admin = await request(endpoint(webBase, '/admin'));
  checks.push({
    id: 'admin-entry-without-session',
    result: admin,
    assertions: [
      assertion(
        'expected-status',
        (admin.status >= 200 && admin.status < 400) || admin.status === 401 || admin.status === 403,
        `status ${admin.status}`,
      ),
      ...securityHeaderAssertions(admin),
    ],
  });

  if (apiBase) {
    const health = await request(endpoint(apiBase, '/api/v1/health'));
    checks.push({
      id: 'api-health',
      result: health,
      assertions: [
        assertion('http-success', health.status >= 200 && health.status < 300, `status ${health.status}`),
        ...securityHeaderAssertions(health),
      ],
    });
  }

  const evidence = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    mode: 'non-destructive-network-probe',
    webBase: webBase.toString(),
    apiBase: apiBase?.toString() ?? null,
    checks: checks.map(({ id, result, assertions }) => ({
      id,
      url: result.url,
      status: result.status,
      durationMs: result.durationMs,
      headers: evidenceHeadersOf(result.headers),
      assertions,
    })),
    limits: [
      'This probe does not authenticate, submit forms, upload files, or perform browser/assistive-technology validation.',
      'A passing probe does not close AUDIT-6 or replace issue #108 staging evidence.',
      'Only content-type and the audited security-header allowlist are recorded. Cookies, authorization material, and all other response headers are excluded.',
      'No credentials, cookies, access tokens, or refresh tokens are recorded by this script.',
    ],
  };

  const outputDirectory = resolve(process.cwd(), 'audit-6-artifacts/staging-probe');
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(
    resolve(outputDirectory, 'result.json'),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );

  for (const check of evidence.checks) {
    for (const item of check.assertions) {
      console.log(`${item.passed ? 'PASS' : 'FAIL'} ${check.id} ${item.name}: ${item.detail}`);
    }
  }

  const failures = evidence.checks.flatMap((check) =>
    check.assertions.filter((item) => !item.passed).map((item) => `${check.id}/${item.name}`),
  );
  if (failures.length) {
    throw new Error(`AUDIT-6 staging probe failed: ${failures.join(', ')}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
