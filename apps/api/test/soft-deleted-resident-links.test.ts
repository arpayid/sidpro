import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL(
    '../../../prisma/migrations/20260628000700_clean_soft_deleted_resident_links/migration.sql',
    import.meta.url,
  ),
  'utf8',
);

const runtimeTest = readFileSync(
  new URL('../../../scripts/db/test-soft-deleted-resident-links.sh', import.meta.url),
  'utf8',
);

describe('soft-deleted resident family cleanup', () => {
  it('reconciles historical deleted residents before installing the guard', () => {
    assert.match(migration, /DELETE FROM family_members fm[\s\S]*r\.deleted_at IS NOT NULL/);
    assert.match(migration, /UPDATE families f[\s\S]*head_resident_id = NULL/);
    assert.match(migration, /UPDATE residents\s+SET family_id = NULL[\s\S]*deleted_at IS NOT NULL/);
  });

  it('detaches future soft deletes without implicitly restoring prior links', () => {
    assert.match(migration, /detach_soft_deleted_resident_from_family/);
    assert.match(migration, /cleanup_soft_deleted_resident_family_dependents/);
    assert.match(migration, /BEFORE UPDATE OF deleted_at ON residents/);
    assert.match(migration, /AFTER UPDATE OF deleted_at ON residents/);
    assert.match(migration, /NEW\.family_id := NULL/);
  });

  it('uses a rollback-only PostgreSQL fixture to verify the active relationship cleanup', () => {
    assert.match(runtimeTest, /BEGIN;/);
    assert.match(runtimeTest, /soft-deleted resident retained a family_id/);
    assert.match(runtimeTest, /soft-deleted resident remained an active family member/);
    assert.match(runtimeTest, /soft-deleted resident remained family head/);
    assert.match(runtimeTest, /restoring a resident silently restored stale family links/);
    assert.match(runtimeTest, /ROLLBACK;/);
  });
});
