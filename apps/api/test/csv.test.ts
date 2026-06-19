import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { escapeCsvCell } from '../src/common/utils/csv.util.js';

describe('csv util', () => {
  it('escapes quotes and neutralizes spreadsheet formulas', () => {
    assert.equal(escapeCsvCell('hello'), '"hello"');
    assert.equal(escapeCsvCell('=1+1'), '"\'=1+1"');
    assert.equal(escapeCsvCell('say "hi"'), '"say ""hi"""');
  });
});
