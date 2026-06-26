import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createAgendaSchema,
  createAssetSchema,
  createBudgetYearSchema,
  createBumdesBusinessSchema,
  createCivilEventSchema,
  createDevelopmentProjectSchema,
  createGalleryItemSchema,
  createHamletSchema,
  createPostSchema,
  createSocialAidProgramSchema,
  createSocialAidRecipientSchema,
  updateAssetSchema,
  updateNeighborhoodUnitSchema,
} from '@sidpro/validators';

const uuid = '123e4567-e89b-12d3-a456-426614174000';

describe('admin module mutation validation schemas', () => {
  it('rejects malformed mutation payloads for focused modules', () => {
    assert.equal(createAssetSchema.safeParse({ name: '', code: '<script>', category: 'x', value: -1 }).success, false);
    assert.equal(createDevelopmentProjectSchema.safeParse({ name: 'Jalan', code: 'PRJ-1', progress: 101 }).success, false);
    assert.equal(createBudgetYearSchema.safeParse({ year: 1800, totalBudget: -10 }).success, false);
    assert.equal(createSocialAidProgramSchema.safeParse({ name: 'BLT', code: 'BLT', startDate: 'not-date' }).success, false);
    assert.equal(createSocialAidRecipientSchema.safeParse({ residentId: 'bad-id' }).success, false);
    assert.equal(createBumdesBusinessSchema.safeParse({ name: 'Usaha', code: 'BUM', status: 'deleted' }).success, false);
    assert.equal(createPostSchema.safeParse({ title: 'Berita', slug: 'berita-1', content: '' }).success, false);
    assert.equal(createAgendaSchema.safeParse({ title: 'Rapat', startAt: 'not-date' }).success, false);
    assert.equal(createCivilEventSchema.safeParse({ residentId: uuid, eventType: 'invalid', eventDate: '2026-01-01' }).success, false);
    assert.equal(createHamletSchema.safeParse({ name: 'A', code: '01', tenantId: uuid }).success, false);
    assert.equal(createGalleryItemSchema.safeParse({ title: 'Foto', fileId: 'bad-id' }).success, false);
    assert.equal(updateAssetSchema.safeParse({}).success, false);
    assert.equal(updateNeighborhoodUnitSchema.safeParse({}).success, false);
  });

  it('accepts valid mutation payloads for focused modules', () => {
    assert.equal(createAssetSchema.safeParse({ name: 'Mobil Operasional', code: 'AST-001', category: 'kendaraan', value: 1 }).success, true);
    assert.equal(createDevelopmentProjectSchema.safeParse({ name: 'Jalan Desa', code: 'DEV-001', progress: 50, startDate: '2026-01-01' }).success, true);
    assert.equal(createBudgetYearSchema.safeParse({ year: 2026, totalBudget: 1000000 }).success, true);
    assert.equal(createSocialAidProgramSchema.safeParse({ name: 'BLT', code: 'BLT-2026', status: 'active' }).success, true);
    assert.equal(createSocialAidRecipientSchema.safeParse({ residentId: uuid, amount: 300000 }).success, true);
    assert.equal(createBumdesBusinessSchema.safeParse({ name: 'Unit Dagang', code: 'BMD-001', businessType: 'retail' }).success, true);
    assert.equal(createPostSchema.safeParse({ title: 'Berita Desa', slug: 'berita-desa', content: 'Konten berita' }).success, true);
    assert.equal(createAgendaSchema.safeParse({ title: 'Musdes', startAt: '2026-01-01' }).success, true);
    assert.equal(createCivilEventSchema.safeParse({ residentId: uuid, eventType: 'birth', eventDate: '2026-01-01' }).success, true);
    assert.equal(createHamletSchema.safeParse({ name: 'Dusun Krajan', code: 'DK' }).success, true);
    assert.equal(createGalleryItemSchema.safeParse({ title: 'Foto Kegiatan', fileId: uuid }).success, true);
  });
});

describe('admin module tenant scope safeguards', () => {
  for (const [moduleName, servicePath] of Object.entries({
    assets: 'src/modules/assets/assets.service.ts',
    development: 'src/modules/development/development.service.ts',
    finance: 'src/modules/finance/finance.service.ts',
    'social-assistance': 'src/modules/social-assistance/social-assistance.service.ts',
    bumdes: 'src/modules/bumdes/bumdes.service.ts',
    cms: 'src/modules/cms/cms.service.ts',
    'civil-events': 'src/modules/civil-events/civil-events.service.ts',
    territories: 'src/modules/territories/territories.service.ts',
  })) {
    it(`${moduleName} service requires tenant scope and uses tenant filters`, () => {
      const source = readFileSync(new URL(`../${servicePath}`, import.meta.url), 'utf8');
      assert.match(source, /requireTenant\(user\)/);
      assert.match(source, /tenantId/);
      assert.doesNotMatch(source, /tenantId:\s*body\.tenantId/);
    });
  }
});
