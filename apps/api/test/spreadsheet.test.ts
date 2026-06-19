import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  jsonToXlsxBuffer,
  xlsxBufferToJson,
} from '../src/common/utils/spreadsheet.util.js';

describe('spreadsheet util', () => {
  it('round-trips json rows through xlsx buffer', async () => {
    const rows = [
      { nik: '3201010101010001', fullName: 'Budi', gender: 'male' },
      { nik: '3201010101010002', fullName: 'Siti', gender: 'female' },
    ];

    const buffer = await jsonToXlsxBuffer([{ name: 'Penduduk', rows }]);
    const parsed = await xlsxBufferToJson(buffer);

    assert.equal(parsed.length, 2);
    assert.equal(parsed[0]?.nik, '3201010101010001');
    assert.equal(parsed[1]?.fullName, 'Siti');
  });
});
