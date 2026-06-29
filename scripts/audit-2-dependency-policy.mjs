import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'));
}

const declarations = [
  { path: 'package.json', section: 'dependencies', dependency: '@prisma/client' },
  { path: 'package.json', section: 'devDependencies', dependency: '@prisma/client' },
  { path: 'package.json', section: 'devDependencies', dependency: 'prisma' },
  { path: 'apps/api/package.json', section: 'dependencies', dependency: '@prisma/client' },
  { path: 'apps/worker/package.json', section: 'dependencies', dependency: '@prisma/client' },
].map(({ path, section, dependency }) => {
  const manifest = readJson(path);
  return {
    path,
    section,
    dependency,
    version: manifest?.[section]?.[dependency] ?? null,
  };
});

const rootPackage = readJson('package.json');
const registry = readJson('docs/audits/AUDIT-2-DEPENDENCY-EXCEPTIONS.json');
const configuredIgnoreIds = rootPackage?.pnpm?.auditConfig?.ignoreCves ?? [];
const registeredIds = Array.isArray(registry.exceptions) ? registry.exceptions.map((entry) => entry.id) : [];
const failures = [];

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

const prismaVersions = declarations
  .filter(({ version }) => version !== null)
  .map(({ version }) => version);
const normalizedPrismaVersions = new Set(prismaVersions);
const declarationDrift = normalizedPrismaVersions.size > 1;

const result = {
  prismaDeclarations: declarations,
  declarationDrift,
  guidance: declarationDrift
    ? 'Prisma declaration drift is an AUDIT-2 finding. Do not align manifests without regenerating pnpm-lock.yaml with pnpm 10.18.3 in the same pull request.'
    : 'Direct Prisma declarations are aligned.',
  configuredIgnoreIds,
  registeredIds,
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
