import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const registryPath = resolve(root, 'docs/audits/AUDIT-2-DEPENDENCY-EXCEPTIONS.json');
const packagePath = resolve(root, 'package.json');
const [mode = 'verify', rawAuditPath, outputPath] = process.argv.slice(2);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function toUtcDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function configuredIgnoreIds(pkg) {
  const ids = pkg?.pnpm?.auditConfig?.ignoreCves;
  return Array.isArray(ids) ? ids : [];
}

function validateRegistry(registry, pkg) {
  const failures = [];
  const exceptions = Array.isArray(registry.exceptions) ? registry.exceptions : [];
  const registryIds = exceptions.map((entry) => entry.id);
  const configuredIds = configuredIgnoreIds(pkg);

  if (new Set(registryIds).size !== registryIds.length) {
    failures.push('The dependency exception registry contains duplicate identifiers.');
  }

  if (new Set(configuredIds).size !== configuredIds.length) {
    failures.push('package.json pnpm.auditConfig.ignoreCves contains duplicate identifiers.');
  }

  const missingRegistryEntries = configuredIds.filter((id) => !registryIds.includes(id));
  const staleRegistryEntries = registryIds.filter((id) => !configuredIds.includes(id));

  if (missingRegistryEntries.length > 0) {
    failures.push(`Configured ignoreCves missing registry entries: ${missingRegistryEntries.join(', ')}`);
  }

  if (staleRegistryEntries.length > 0) {
    failures.push(`Registry entries not configured in ignoreCves: ${staleRegistryEntries.join(', ')}`);
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (const entry of exceptions) {
    const requiredFields = ['id', 'status', 'owner', 'metadataStatus', 'reviewBy', 'expiresOn', 'rationale', 'removalCondition'];
    for (const field of requiredFields) {
      if (!entry[field] || (typeof entry[field] === 'string' && entry[field].trim() === '')) {
        failures.push(`${entry.id ?? '<unknown>'} is missing required field: ${field}`);
      }
    }

    if (!Array.isArray(entry.compensatingControls) || entry.compensatingControls.length === 0) {
      failures.push(`${entry.id ?? '<unknown>'} must have at least one compensating control.`);
    }

    const reviewBy = toUtcDate(entry.reviewBy);
    const expiresOn = toUtcDate(entry.expiresOn);
    if (!reviewBy) {
      failures.push(`${entry.id ?? '<unknown>'} has invalid reviewBy date.`);
    }
    if (!expiresOn) {
      failures.push(`${entry.id ?? '<unknown>'} has invalid expiresOn date.`);
    }
    if (reviewBy && expiresOn && reviewBy > expiresOn) {
      failures.push(`${entry.id ?? '<unknown>'} reviewBy must not be after expiresOn.`);
    }
    if (expiresOn && expiresOn < today) {
      failures.push(`${entry.id ?? '<unknown>'} has expired on ${entry.expiresOn}; renew with rationale or remove the suppression.`);
    }
  }

  return {
    schemaVersion: registry.schemaVersion,
    configuredIds,
    registryIds,
    exceptionCount: exceptions.length,
    failures,
  };
}

function flattenAdvisories(raw) {
  const advisories = raw?.advisories;
  if (Array.isArray(advisories)) {
    return advisories;
  }
  if (advisories && typeof advisories === 'object') {
    return Object.values(advisories);
  }
  if (Array.isArray(raw?.vulnerabilities)) {
    return raw.vulnerabilities;
  }
  if (raw?.vulnerabilities && typeof raw.vulnerabilities === 'object') {
    return Object.values(raw.vulnerabilities);
  }
  return [];
}

function advisoryIdentifiers(advisory) {
  const candidates = [
    advisory?.id,
    advisory?.github_advisory_id,
    advisory?.githubAdvisoryId,
    ...(Array.isArray(advisory?.cves) ? advisory.cves : []),
    ...(Array.isArray(advisory?.identifiers) ? advisory.identifiers.map((item) => item?.value ?? item) : []),
    advisory?.url,
  ].filter(Boolean);

  return new Set(candidates.map((value) => String(value).toUpperCase()));
}

function advisorySummary(advisory) {
  return {
    advisoryId: advisory?.id ?? advisory?.github_advisory_id ?? advisory?.githubAdvisoryId ?? null,
    title: advisory?.title ?? null,
    severity: advisory?.severity ?? null,
    moduleName: advisory?.module_name ?? advisory?.moduleName ?? advisory?.package?.name ?? null,
    vulnerableVersions: advisory?.vulnerable_versions ?? advisory?.vulnerableVersions ?? null,
    patchedVersions: advisory?.patched_versions ?? advisory?.patchedVersions ?? null,
    url: advisory?.url ?? null,
    findings: Array.isArray(advisory?.findings) ? advisory.findings : [],
    cves: Array.isArray(advisory?.cves) ? advisory.cves : [],
  };
}

const registry = readJson(registryPath);
const pkg = readJson(packagePath);
const validation = validateRegistry(registry, pkg);

if (mode === 'verify') {
  console.log(JSON.stringify(validation, null, 2));
  if (validation.failures.length > 0) {
    process.exitCode = 1;
  }
} else if (mode === 'inventory') {
  if (!rawAuditPath || !outputPath) {
    throw new Error('Usage: node scripts/audit-2-dependency-exceptions.mjs inventory <raw-audit-json> <output-json>');
  }

  const rawAudit = readJson(resolve(root, rawAuditPath));
  const advisories = flattenAdvisories(rawAudit);
  const inventory = {
    generatedFrom: rawAuditPath,
    registryValidation: validation,
    advisoryCount: advisories.length,
    exceptions: registry.exceptions.map((entry) => {
      const id = entry.id.toUpperCase();
      const matches = advisories
        .filter((advisory) => advisoryIdentifiers(advisory).has(id) || String(advisory?.url ?? '').toUpperCase().includes(id))
        .map(advisorySummary);

      return {
        id: entry.id,
        metadataStatus: entry.metadataStatus,
        matchCount: matches.length,
        matches,
      };
    }),
  };

  const destination = resolve(root, outputPath);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(inventory, null, 2)}\n`);
  console.log(JSON.stringify(inventory, null, 2));

  if (validation.failures.length > 0) {
    process.exitCode = 1;
  }
} else {
  throw new Error(`Unknown mode: ${mode}`);
}
