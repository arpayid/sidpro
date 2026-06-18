import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('api health', () => {
  it('should pass basic test', () => {
    assert.equal(1 + 1, 2);
  });
});
