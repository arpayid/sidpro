import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addFamilyMemberSchema,
  createFamilySchema,
  createResidentSchema,
  residentMutationSchema,
} from './population.js';

const validResident = {
  nik: '3201010101010001',
  fullName: 'Budi Santoso',
  gender: 'male',
  birthPlace: 'Bandung',
  birthDate: '1990-01-31',
  residentStatus: 'permanent',
};

describe('population validators', () => {
  it('rejects invalid NIK', () => {
    assert.equal(createResidentSchema.safeParse({ ...validResident, nik: 'ABC' }).success, false);
  });

  it('rejects invalid KK number', () => {
    assert.equal(createFamilySchema.safeParse({ kkNumber: '1234' }).success, false);
  });

  it('rejects impossible birth and mutation dates', () => {
    assert.equal(
      createResidentSchema.safeParse({ ...validResident, birthDate: '2026-02-31' }).success,
      false,
    );
    assert.equal(
      residentMutationSchema.safeParse({ residentStatus: 'moved', eventDate: '2026-13-01' })
        .success,
      false,
    );
  });

  it('rejects invalid family relationship', () => {
    assert.equal(
      addFamilyMemberSchema.safeParse({
        residentId: '11111111-1111-4111-8111-111111111111',
        relationship: 'roommate',
      }).success,
      false,
    );
  });
});
