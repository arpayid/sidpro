'use client';

import { useState, type FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@sidpro/ui';
import { setAuthSession } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import type { LoginResponse, LoginResult } from '@sidpro/types';

function isTwoFactorChallenge(
  data: LoginResult,
): data is { requiresTwoFactor: true; twoFactorToken: string } {
  return 'requiresTwoFactor' in data && data.requiresTwoFactor === true;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/admin/dashboard';

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');

  async function completeLogin(data: LoginResponse) {
    setAuthSession(data.accessToken, data.refreshToken, data.user);
    router.push(callbackUrl.startsWith('/admin') ? callbackUrl : '/admin/dashboard');
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get('email') as string;
    const password = form.get('password') as string;

    try {
      const body = await apiClient<LoginResult>('/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuth: true,
      });

      if (!body.data) throw new Error('Respons login tidak valid');

      if (isTwoFactorChallenge(body.data)) {
        setTwoFactorToken(body.data.twoFactorToken);
        return;
      }

      await completeLogin(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email atau password salah');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyTwoFactor(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!twoFactorToken) return;
    setError('');
    setLoading(true);

    try {
      const body = await apiClient<LoginResponse>('/auth/2fa/verify-login', {
        method: 'POST',
        body: { twoFactorToken, token: totpCode },
        skipAuth: true,
      });

      if (!body.data) throw new Error('Verifikasi 2FA gagal');
      await completeLogin(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kode 2FA tidak valid');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-slate-200/80 shadow-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Shield className="h-5 w-5" />
        </div>
        <CardTitle className="text-lg">
          {twoFactorToken ? 'Verifikasi 2FA' : 'Masuk Admin SIDPRO'}
        </CardTitle>
        <p className="text-sm text-slate-500">
          {twoFactorToken
            ? 'Masukkan kode 6 digit dari aplikasi authenticator'
            : 'Platform pemerintahan desa enterprise'}
        </p>
      </CardHeader>
      <CardContent>
        {twoFactorToken ? (
          <form onSubmit={handleVerifyTwoFactor} className="space-y-4">
            <div>
              <label htmlFor="totp" className="form-label">
                Kode 2FA
              </label>
              <Input
                id="totp"
                inputMode="numeric"
                maxLength={6}
                required
                autoComplete="one-time-code"
                placeholder="123456"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
              />
            </div>
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading || totpCode.length < 6}>
              {loading ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setTwoFactorToken(null);
                setTotpCode('');
                setError('');
              }}
            >
              Kembali ke login
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@demo-desa.id"
              />
            </div>
            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Memverifikasi...' : 'Masuk'}
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/" className="text-emerald-600 hover:underline">
            Kembali ke portal publik
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] p-4">
      <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-lg bg-slate-200" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
