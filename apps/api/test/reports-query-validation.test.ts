import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { JwtPayload } from '../src/common/decorators/current-user.decorator.js';
import { ReportsController } from '../src/modules/reports/reports.controller.js';

const user: JwtPayload = {
  sub: 'user-tenant-a',
  email: 'operator@tenant-a.test',
  tenantId: 'tenant-a',
  roles: ['operator_desa'],
  permissions: ['reports.finance', 'reports.export', 'audit.read'],
};

function createController() {
  const calls = {
    finance: [] as Array<number | undefined>,
    financeExport: [] as Array<number | undefined>,
    audit: [] as number[],
  };

  const reportsService = {
    getFinanceReport: async (_user: JwtPayload, year?: number) => {
      calls.finance.push(year);
      return null;
    },
    exportFinanceReport: async (
      _user: JwtPayload,
      _ipAddress: string | undefined,
      _res: Response,
      year?: number,
    ) => {
      calls.financeExport.push(year);
    },
    getAuditReport: async (_user: JwtPayload, days: number) => {
      calls.audit.push(days);
      return null;
    },
  };

  return { controller: new ReportsController(reportsService as never), calls };
}

const request = { ip: '127.0.0.1' } as Request;
const response = {} as Response;

describe('reports query validation', () => {
  it('parses valid finance years and preserves the no-filter default', async () => {
    const { controller, calls } = createController();

    await controller.getFinanceReport(user, '2026');
    await controller.getFinanceReport(user);
    await controller.exportFinanceReport(user, request, response, '2200');
    await controller.exportFinanceReport(user, request, response);

    assert.deepEqual(calls.finance, [2026, undefined]);
    assert.deepEqual(calls.financeExport, [2200, undefined]);
  });

  it('rejects malformed and out-of-range finance years before the service is called', () => {
    const { controller, calls } = createController();

    for (const year of ['', '2026abc', '2026.5', '1899', '2201']) {
      assert.throws(() => controller.getFinanceReport(user, year), BadRequestException);
      assert.throws(
        () => controller.exportFinanceReport(user, request, response, year),
        BadRequestException,
      );
    }

    assert.deepEqual(calls.finance, []);
    assert.deepEqual(calls.financeExport, []);
  });

  it('defaults the audit window to 30 days and accepts bounded integer values', async () => {
    const { controller, calls } = createController();

    await controller.getAuditReport(user);
    await controller.getAuditReport(user, '365');

    assert.deepEqual(calls.audit, [30, 365]);
  });

  it('rejects malformed and unbounded audit windows before the service is called', () => {
    const { controller, calls } = createController();

    for (const days of ['', '0', '366', '30.5', '30days']) {
      assert.throws(() => controller.getAuditReport(user, days), BadRequestException);
    }

    assert.deepEqual(calls.audit, []);
  });
});
