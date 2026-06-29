import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'));
}

const packageManifests = [
  { path: 'package.json', fields: [['dependencies', '@prisma/client'], ['devDependencies', 'prisma']] },
  { path: 'apps/api/package.json', fields: [['dependencies', '@prisma/client']] },
  { path: 'apps/worker/package.json', fields: [['dependencies', '@prisma/client']] },
];

const rootPackage = readJson('package.json');
const expectedPrismaVersion = rootPackage?.dependencies?.['@prisma/client'];
const failures = [];

if (typeof expectedPrismaVersion !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(expectedPrismaVersion)) {
  failures.push('Root dependencies.@prisma/client must be an exact semantic version.');
}

for (const { path, fields } of packageManifests) {
  const manifest = readJson(path);
  for (const [section, dependency] of fields) {
    const version = manifest?.[section]?.[dependency];
    if (version !== expectedPrismaVersion) {
      failures.push(`${path} ${section}.${dependency} must equal ${expectedPrismaVersion}; found ${version ?? '<missing>'}.`);
    }
  }
}

const registry = readJson('docs/audits/AUDIT-2-DEPENDENCY-EXCEPTIONS.json');
const configuredIgnoreIds = rootPackage?.pnpm?.auditConfig?.ignoreCves ?? [];
const registeredIds = Array.isArray(registry.exceptions) ? registry.exceptions.map((entry) => entry.id) : [];

for (const id of configuredIgnoreIds) {
  if (!registeredIds.includes(id)) {
    failures.push(`pnpm.auditConfig.ignoreCves entry ${id} is missing from the dependency exception registry.`);
  }
}

for (const id of registeredIds) {
  if (!configuredIgnoreIds.includes(id)) {
    failures.push(`Dependency exception registry entry ${id} is not configured in pnpm.auditConfig.ignoreCves.`);
  }
}

const result = {
  expectedPrismaVersion,
  manifestsChecked: packageManifests.map(({ path }) => path),
  configuredIgnoreIds,
  registeredIds,
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
