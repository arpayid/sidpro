import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { publicComplaintTrackSchema } from '@sidpro/validators';

describe('publicComplaintTrackSchema', () => {
  it('requires exactly 8 ticket suffix characters', () => {
    const ok = publicComplaintTrackSchema.safeParse({
      ticket: 'PGD-19F10A9D',
      reporterPhone: '08123456789',
    });
    assert.equal(ok.success, true);

    const short = publicComplaintTrackSchema.safeParse({
      ticket: 'PGD-ABCD',
      reporterPhone: '08123456789',
    });
    assert.equal(short.success, false);
  });
});
