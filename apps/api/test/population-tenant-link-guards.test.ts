import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL(
    '../../../prisma/migrations/20260628000300_enforce_population_tenant_link_guards/migration.sql',
    import.meta.url,
  ),
  'utf8',
);

const preflight = readFileSync(
  new URL('../../../scripts/db/verify-tenant-link-integrity.sql', import.meta.url),
  'utf8',
);

describe('population tenant-link guard migration', () => {
  it('uses the existing same-tenant assertion before every tenant-owned link', () => {
    assert.match(migration, /assert_same_tenant_link\(/);

    for (const relation of [
      'neighborhood_units.hamlet_id',
      'addresses.hamlet_id',
      'addresses.neighborhood_unit_id',
      'residents.family_id',
      'residents.address_id',
      'family_members.family_id',
      'family_members.resident_id',
      'civil_events.resident_id',
      'bumdes_financial_records.unit_id',
    ]) {
      assert.match(migration, new RegExp(relation.replace('.', '\\.')));
    }
  });

  it('requires an address neighborhood unit to belong to its selected hamlet', () => {
    assert.match(migration, /CREATE OR REPLACE FUNCTION assert_address_neighborhood_hierarchy/);
    assert.match(migration, /addresses\.neighborhood_unit_id must belong to addresses\.hamlet_id/);
    assert.match(migration, /assert_address_neighborhood_hierarchy\(/);
  });

  it('creates targeted triggers for all newly protected tables', () => {
    for (const trigger of [
      'tenant_link_guard_neighborhood_units',
      'tenant_link_guard_addresses',
      'tenant_link_guard_residents',
      'tenant_link_guard_family_members',
      'tenant_link_guard_civil_events',
      'tenant_link_guard_bumdes_financial_records',
    ]) {
      assert.match(migration, new RegExp(`CREATE TRIGGER ${trigger}`));
    }
  });

  it('extends the production preflight query for every protected population link', () => {
    for (const relation of [
      'neighborhood_units.hamlet_id',
      'addresses.hamlet_id',
      'addresses.neighborhood_unit_id',
      'addresses.neighborhood_unit_hamlet_mismatch',
      'residents.family_id',
      'residents.address_id',
      'family_members.family_id',
      'family_members.resident_id',
      'civil_events.resident_id',
      'bumdes_financial_records.unit_id',
    ]) {
      assert.match(preflight, new RegExp(relation.replace('.', '\\.')));
    }
  });
});
