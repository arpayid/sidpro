import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LETTER_TEMPLATE,
  formatDateId,
  renderLetterTemplate,
} from '../src/modules/letters/letter-pdf.service.js';

describe('letter pdf helpers', () => {
  it('formatDateId returns Indonesian month name', () => {
    const formatted = formatDateId(new Date('2026-06-18T12:00:00Z'));
    assert.match(formatted, /Juni 2026/);
  });

  it('renderLetterTemplate substitutes placeholders', () => {
    const rendered = renderLetterTemplate(DEFAULT_LETTER_TEMPLATE, {
      nama_desa: 'Desa Demo',
      nama_pemohon: 'Warga Test',
      nik: '3201010101010001',
      alamat_pemohon: 'Jl. Test',
      keperluan: 'Keperluan administrasi',
    });
    assert.match(rendered, /Desa Demo/);
    assert.match(rendered, /Warga Test/);
    assert.doesNotMatch(rendered, /\{\{/);
  });
});
