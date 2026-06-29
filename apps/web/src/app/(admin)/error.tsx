'use client';

import { useEffect } from 'react';
import { Button } from '@sidpro/ui';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin route rendering failed', { digest: error.digest });
  }, [error.digest]);

  return (
    <section className="mx-auto flex min-h-[16rem] max-w-lg items-center justify-center" role="alert" aria-live="assertive">
      <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-5 text-center shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-red-900">Halaman administrasi tidak dapat dimuat</h2>
          <p className="mt-1 text-sm text-red-800">
            Coba muat ulang halaman. Bila masalah berlanjut, hubungi administrator sistem.
          </p>
        </div>
        <Button type="button" onClick={reset}>
          Coba lagi
        </Button>
      </div>
    </section>
  );
}
