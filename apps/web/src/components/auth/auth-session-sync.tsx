'use client';

import { useEffect } from 'react';
import { syncAuthProfile } from '@/lib/api-client';

export function AuthSessionSync() {
  useEffect(() => {
    void syncAuthProfile();
  }, []);

  return null;
}
