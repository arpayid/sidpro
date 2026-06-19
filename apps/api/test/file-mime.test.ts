import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertMimeMatchesBuffer } from '../src/common/utils/file-mime.util';

describe('file-mime util', () => {
  it('accepts valid JPEG magic bytes', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    assert.doesNotThrow(() => assertMimeMatchesBuffer('image/jpeg', buf));
  });

  it('rejects mismatched MIME content', () => {
    const buf = Buffer.from('%PDF-1.4');
    assert.throws(
      () => assertMimeMatchesBuffer('image/jpeg', buf),
      /Konten file tidak sesuai/,
    );
  });
});
