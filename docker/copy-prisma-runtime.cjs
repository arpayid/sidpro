const fs = require('node:fs');
const path = require('node:path');

const deployedClientLink = '/prod/app/node_modules/@prisma/client';

if (!fs.existsSync(deployedClientLink)) {
  process.exit(0);
}

const sourceClientRealPath = fs.realpathSync('/app/node_modules/@prisma/client');
const deployedClientRealPath = fs.realpathSync(deployedClientLink);
const sourcePrismaDir = path.resolve(sourceClientRealPath, '..', '..', '.prisma');
const deployedVirtualStorePrismaDir = path.resolve(
  deployedClientRealPath,
  '..',
  '..',
  '.prisma',
);
const deployedTopLevelPrismaDir = '/prod/app/node_modules/.prisma';

if (!fs.existsSync(sourcePrismaDir)) {
  throw new Error(`Generated Prisma client directory is missing: ${sourcePrismaDir}`);
}

fs.rmSync(deployedVirtualStorePrismaDir, { force: true, recursive: true });
fs.cpSync(sourcePrismaDir, deployedVirtualStorePrismaDir, { recursive: true });
fs.rmSync(deployedTopLevelPrismaDir, { force: true, recursive: true });
fs.cpSync(sourcePrismaDir, deployedTopLevelPrismaDir, { recursive: true });
