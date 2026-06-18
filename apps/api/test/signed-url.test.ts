import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMinioInternalBaseUrl,
  rewriteMinioSignedUrl,
} from '../src/core/storage/signed-url.util.js';

describe('minio signed url rewrite', () => {
  it('returns original url when public base is missing', () => {
    const url = 'http://localhost:9000/sidpro-files/test.pdf?sig=abc';
    assert.equal(rewriteMinioSignedUrl(url, 'http://localhost:9000'), url);
  });

  it('rewrites internal host to public base', () => {
    const internal = 'http://localhost:9000';
    const url = `${internal}/sidpro-files/test.pdf?X-Amz-Signature=abc`;
    const rewritten = rewriteMinioSignedUrl(url, internal, 'https://files.example.com');
    assert.equal(rewritten, 'https://files.example.com/sidpro-files/test.pdf?X-Amz-Signature=abc');
  });

  it('builds internal base url from config', () => {
    assert.equal(
      buildMinioInternalBaseUrl({ endpoint: 'minio', port: '9000', useSsl: false }),
      'http://minio:9000',
    );
  });
});
