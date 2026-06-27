import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL(
    '../../../prisma/migrations/20260628000200_enforce_tenant_link_guards/migration.sql',
    import.meta.url,
  ),
  'utf8',
);

const preflight = readFileSync(
  new URL('../../../scripts/db/verify-tenant-link-integrity.sql', import.meta.url),
  'utf8',
);

describe('database tenant-link guard migration', () => {
  it('uses the repository TEXT identifiers and exposes a same-tenant assertion helper', () => {
    assert.match(migration, /CREATE OR REPLACE FUNCTION assert_same_tenant_link/);
    assert.match(migration, /p_tenant_id text/);
    assert.match(migration, /p_reference_id text/);
    assert.match(migration, /linked_tenant_id text/);
    assert.match(migration, /ERRCODE = '23514'/);
  });

  it('guards every confirmed cross-tenant association from AUDIT-5', () => {
    const guards = [
      ['families', 'address_id'],
      ['families', 'head_resident_id'],
      ['letter_templates', 'letter_type_id'],
      ['aid_recipients', 'program_id'],
      ['aid_recipients', 'resident_id'],
      ['aid_recipients', 'family_id'],
      ['finance_documents', 'file_id'],
      ['gallery_items', 'file_id'],
      ['letter_outputs', 'letter_request_id'],
      ['letter_outputs', 'file_id'],
    ];

    for (const [table, column] of guards) {
      assert.match(migration, new RegExp(`${table}\\.${column}`));
    }

    for (const trigger of [
      'tenant_link_guard_families',
      'tenant_link_guard_letter_templates',
      'tenant_link_guard_aid_recipients',
      'tenant_link_guard_finance_documents',
      'tenant_link_guard_gallery_items',
      'tenant_link_guard_letter_outputs',
    ]) {
      assert.match(migration, new RegExp(`CREATE TRIGGER ${trigger}`));
    }
  });

  it('restricts deletion while file-backed records still exist', () => {
    for (const constraint of [
      'finance_documents_file_id_restrict_fkey',
      'gallery_items_file_id_restrict_fkey',
      'letter_outputs_file_id_restrict_fkey',
    ]) {
      assert.match(migration, new RegExp(`ADD CONSTRAINT ${constraint}`));
    }
    assert.match(migration, /FOREIGN KEY \(file_id\) REFERENCES files\(id\) ON DELETE RESTRICT/);
  });

  it('ships a preflight query for historical integrity violations', () => {
    assert.match(preflight, /Expected result: zero rows/);
    assert.match(preflight, /families\.address_id/);
    assert.match(preflight, /aid_recipients\.resident_id/);
    assert.match(preflight, /finance_documents\.file_id/);
    assert.match(preflight, /gallery_items\.file_id/);
    assert.match(preflight, /letter_outputs\.file_id/);
  });
});
