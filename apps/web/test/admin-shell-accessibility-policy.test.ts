import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));

function source(path: string): string {
  return readFileSync(`${root}apps/web/${path}`, 'utf8');
}

describe('AUDIT-6 admin shell accessibility policy', () => {
  it('keeps a skip link and focusable main landmark', () => {
    const layout = source('src/app/(admin)/layout.tsx');
    assert.match(layout, /href="#main-content"/);
    assert.match(layout, /id="main-content"/);
    assert.match(layout, /tabIndex=\{-1\}/);
  });

  it('keeps semantic sidebar navigation and mobile dialog semantics', () => {
    const sidebar = source('src/components/layout/admin-sidebar.tsx');
    assert.match(sidebar, /aria-label="Navigasi administrasi"/);
    assert.match(sidebar, /aria-current=\{active \? 'page' : undefined\}/);
    assert.match(sidebar, /role="dialog"/);
    assert.match(sidebar, /aria-modal="true"/);
  });

  it('keeps an accessible search label and loading/error states', () => {
    const topbar = source('src/components/layout/admin-topbar.tsx');
    const loading = source('src/app/(admin)/loading.tsx');
    const error = source('src/app/(admin)/error.tsx');

    assert.match(topbar, /htmlFor="admin-global-search"/);
    assert.match(topbar, /aria-label=\{notificationLabel\}/);
    assert.match(loading, /role="status"/);
    assert.match(error, /role="alert"/);
  });
});
