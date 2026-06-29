'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { syncAuthProfile } from '@/lib/api-client';
import { sanitizeAdminCallback } from '@/lib/route-policy';

type SessionState = 'checking' | 'authenticated' | 'redirecting';

export function AdminSessionBoundary({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<SessionState>('checking');

  useEffect(() => {
    let active = true;
    const callbackUrl = sanitizeAdminCallback(pathname);

    void syncAuthProfile().then((profile) => {
      if (!active) return;
      if (profile) {
        setState('authenticated');
        return;
      }

      setState('redirecting');
      router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (state !== 'authenticated') {
    return (
      <div className="flex min-h-[16rem] items-center justify-center" role="status" aria-live="polite">
        <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" aria-hidden="true" />
          {state === 'redirecting' ? 'Mengarahkan ke login…' : 'Memverifikasi sesi…'}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
