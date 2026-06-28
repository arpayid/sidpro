import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Response } from 'express';
import type { JwtPayload } from '../src/common/decorators/current-user.decorator.js';
import { ReportsService } from '../src/modules/reports/reports.service.js';
import { PopulationService } from '../src/modules/population/population.service.js';
import { FamiliesService } from '../src/modules/families/families.service.js';

interface PrismaCall {
  model: string;
  operation: string;
  args: Record<string, unknown>;
}

const tenantUser: JwtPayload = {
  sub: 'user-tenant-a',
  email: 'operator@tenant-a.test',
  tenantId: 'tenant-a',
  roles: ['operator_desa'],
  permissions: [
    'reports.read',
    'reports.export',
    'reports.population',
    'reports.letters',
    'reports.finance',
    'audit.read',
    'population.export',
    'families.export',
  ],
};

function record<T>(
  calls: PrismaCall[],
  model: string,
  operation: string,
  result: T,
): (args: Record<string, unknown>) => Promise<T> {
  return async (args) => {
    calls.push({ model, operation, args });
    return result;
  };
}

function createResponse(): Response {
  return {
    setHeader: () => undefined,
    send: () => undefined,
  } as unknown as Response;
}

function assertEveryReadIsTenantScoped(calls: PrismaCall, tenantId: string): void;
function assertEveryReadIsTenantScoped(calls: PrismaCall[], tenantId: string): void;
function assertEveryReadIsTenantScoped(calls: PrismaCall | PrismaCall[], tenantId: string): void {
  for (const call of Array.isArray(calls) ? calls : [calls]) {
    const where = call.args.where as
      | { tenantId?: string; tenantId_year?: { tenantId?: string } }
      | undefined;

    if (call.model === 'budgetYear' && call.operation === 'findUnique') {
      assert.equal(
        where?.tenantId_year?.tenantId,
        tenantId,
        'budget year lookup must use the composite tenant/year key',
      );
      continue;
    }

    assert.equal(
      where?.tenantId,
      tenantId,
      `${call.model}.${call.operation} must use the authenticated tenant scope`,
    );
  }
}

describe('report and export tenant isolation', () => {
  it('applies the authenticated tenant to every reports read and export query', async () => {
    const calls: PrismaCall[] = [];
    const auditEvents: Record<string, unknown>[] = [];

    const prisma = {
      resident: {
        count: record(calls, 'resident', 'count', 0),
        groupBy: record(calls, 'resident', 'groupBy', []),
      },
      family: { count: record(calls, 'family', 'count', 0) },
      letterRequest: {
        count: record(calls, 'letterRequest', 'count', 0),
        groupBy: record(calls, 'letterRequest', 'groupBy', []),
        findMany: record(calls, 'letterRequest', 'findMany', []),
      },
      complaint: {
        count: record(calls, 'complaint', 'count', 0),
        findMany: record(calls, 'complaint', 'findMany', []),
      },
      aidProgram: { count: record(calls, 'aidProgram', 'count', 0) },
      asset: { count: record(calls, 'asset', 'count', 0) },
      developmentProject: { count: record(calls, 'developmentProject', 'count', 0) },
      budgetYear: {
        count: record(calls, 'budgetYear', 'count', 0),
        findUnique: record(calls, 'budgetYear', 'findUnique', { totalBudget: 0, items: [] }),
      },
      auditLog: { findMany: record(calls, 'auditLog', 'findMany', []) },
      civilEvent: { findMany: record(calls, 'civilEvent', 'findMany', []) },
      letterType: { findMany: record(calls, 'letterType', 'findMany', []) },
    };

    const auditLogs = {
      log: async (event: Record<string, unknown>) => {
        auditEvents.push(event);
      },
    };

    const service = new ReportsService(prisma as never, auditLogs as never);

    await service.getDashboard(tenantUser);
    await service.getPopulationReport(tenantUser);
    await service.getLettersReport(tenantUser);
    await service.getFinanceReport(tenantUser, 2026);
    await service.getAuditReport(tenantUser, 30);
    await service.exportPopulationReport(tenantUser, '127.0.0.1', createResponse());
    await service.exportLettersReport(tenantUser, '127.0.0.1', createResponse());
    await service.exportFinanceReport(tenantUser, '127.0.0.1', createResponse(), 2026);

    assert.ok(calls.length > 0, 'the regression fixture must exercise report reads');
    assertEveryReadIsTenantScoped(calls, tenantUser.tenantId!);
    assert.equal(auditEvents.length, 3, 'each report export must write an audit event');
    assert.ok(auditEvents.every((event) => event.tenantId === tenantUser.tenantId));
    assert.ok(auditEvents.every((event) => event.action === 'export'));
  });

  it('rejects report reads and exports when the authenticated user has no tenant scope', async () => {
    const calls: PrismaCall[] = [];
    const prisma = {
      resident: {
        count: record(calls, 'resident', 'count', 0),
        groupBy: record(calls, 'resident', 'groupBy', []),
      },
      family: { count: record(calls, 'family', 'count', 0) },
      letterRequest: {
        count: record(calls, 'letterRequest', 'count', 0),
        groupBy: record(calls, 'letterRequest', 'groupBy', []),
        findMany: record(calls, 'letterRequest', 'findMany', []),
      },
      complaint: {
        count: record(calls, 'complaint', 'count', 0),
        findMany: record(calls, 'complaint', 'findMany', []),
      },
      aidProgram: { count: record(calls, 'aidProgram', 'count', 0) },
      asset: { count: record(calls, 'asset', 'count', 0) },
      developmentProject: { count: record(calls, 'developmentProject', 'count', 0) },
      budgetYear: {
        count: record(calls, 'budgetYear', 'count', 0),
        findUnique: record(calls, 'budgetYear', 'findUnique', null),
      },
      auditLog: { findMany: record(calls, 'auditLog', 'findMany', []) },
      civilEvent: { findMany: record(calls, 'civilEvent', 'findMany', []) },
      letterType: { findMany: record(calls, 'letterType', 'findMany', []) },
    };
    const service = new ReportsService(prisma as never, { log: async () => undefined } as never);
    const globalUser = { ...tenantUser, tenantId: null };

    await assert.rejects(() => service.getDashboard(globalUser), /Tenant scope required/);
    await assert.rejects(
      () => service.exportFinanceReport(globalUser, '127.0.0.1', createResponse(), 2026),
      /Tenant scope required/,
    );
    assert.equal(calls.length, 0, 'scope failure must happen before any database query');
  });

  it('keeps resident and family spreadsheet exports within the authenticated tenant', async () => {
    const populationCalls: PrismaCall[] = [];
    const familyCalls: PrismaCall[] = [];
    const auditEvents: Record<string, unknown>[] = [];
    const auditLogs = {
      log: async (event: Record<string, unknown>) => {
        auditEvents.push(event);
      },
    };

    const populationService = new PopulationService(
      {
        resident: { findMany: record(populationCalls, 'resident', 'findMany', []) },
      } as never,
      auditLogs as never,
    );
    const familiesService = new FamiliesService(
      {
        family: { findMany: record(familyCalls, 'family', 'findMany', []) },
      } as never,
      auditLogs as never,
      {} as never,
    );

    await populationService.exportResidents(tenantUser, '127.0.0.1', createResponse());
    await familiesService.exportFamilies(tenantUser, '127.0.0.1', createResponse());

    assertEveryReadIsTenantScoped(populationCalls, tenantUser.tenantId!);
    assertEveryReadIsTenantScoped(familyCalls, tenantUser.tenantId!);
    assert.equal(auditEvents.length, 2);
    assert.ok(auditEvents.every((event) => event.tenantId === tenantUser.tenantId));
    assert.ok(auditEvents.every((event) => event.action === 'export'));
  });
});
