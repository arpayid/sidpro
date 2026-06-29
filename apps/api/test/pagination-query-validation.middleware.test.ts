import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { PaginationQueryValidationMiddleware } from '../src/common/middleware/pagination-query-validation.middleware.js';

function run(query: Record<string, unknown>) {
  const middleware = new PaginationQueryValidationMiddleware();
  const request = { query };
  let nextCalled = false;
  middleware.use(request, {}, () => {
    nextCalled = true;
  });
  return { query: request.query, nextCalled };
}

describe('PaginationQueryValidationMiddleware', () => {
  it('preserves endpoint defaults when neither pagination parameter is supplied', () => {
    const result = run({ search: 'warga' });
    assert.deepEqual(result.query, { search: 'warga' });
    assert.equal(result.nextCalled, true);
  });

  it('accepts bounded integer pagination parameters', () => {
    const result = run({ page: '2', limit: '100' });
    assert.deepEqual(result.query, { page: '2', limit: '100' });
    assert.equal(result.nextCalled, true);
  });

  it('rejects zero, negative, non-numeric, and oversized pagination parameters', () => {
    for (const query of [
      { page: '0' },
      { page: '-1' },
      { page: 'invalid' },
      { limit: '0' },
      { limit: '101' },
      { limit: 'invalid' },
    ]) {
      assert.throws(() => run(query), BadRequestException);
    }
  });
});
