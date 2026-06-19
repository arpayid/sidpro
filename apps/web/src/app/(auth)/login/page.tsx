'use client';

import { useState, type FormEvent, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@sidpro/ui';
import { setAuthSession } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import type { LoginResponse, LoginResult } from '@sidpro/types';
import {
  useCompleteEnrollLogin,
  useSetupEnrollLogin,
} from '@/features/auth/use-two-fa';

function isTwoFactorChallenge(
  data: LoginResult,
): data is { requiresTwoFactor: true; twoFactorToken: string } {
  return 'requiresTwoFactor' in data && data.requiresTwoFactor === true;
}

function isTwoFactorEnrollment(
  data: LoginResult,
): data is { requiresTwoFactorEnrollment: true; enrollmentToken: string } {
  return 'requiresTwoFactorEnrollment' in data && data.requiresTwoFactorEnrollment === true;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/admin/dashboard';
  const setupEnrollMutation = useSetupEnrollLogin();
  const completeEnrollMutation = useCompleteEnrollLogin();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [enrollmentToken, setEnrollmentToken] = useState<string | null>(null);
  const [enrollSetup, setEnrollSetup] = useState<{ secret: string; otpauthUrl: string } | null>(
    null,
  );
  const [totpCode, setTotpCode] = useState('');

  useEffect(() => {
    if (!enrollmentToken || enrollSetup) return;
    setupEnrollMutation
      .mutateAsync(enrollmentToken)
      .then((data) => setEnrollSetup(data))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Gagal memuat enrollment 2FA');
        setEnrollmentToken(null);
      });
  }, [enrollmentToken, enrollSetup, setupEnrollMutation]);

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

      if (isTwoFactorEnrollment(body.data)) {
        setEnrollmentToken(body.data.enrollmentToken);
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

  async function handleCompleteEnrollment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!enrollmentToken) return;
    setError('');
    setLoading(true);

    try {
      const data = await completeEnrollMutation.mutateAsync({
        enrollmentToken,
        token: totpCode,
      });
      await completeLogin(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aktivasi 2FA gagal');
    } finally {
      setLoading(false);
    }
  }

  const enrollmentMode = Boolean(enrollmentToken);
  const verifyMode = Boolean(twoFactorToken);

  return (
    <Card className="w-full max-w-md border-slate-200/80 shadow-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Shield className="h-5 w-5" />
        </div>
        <CardTitle className="text-lg">
          {enrollmentMode ? 'Aktivasi 2FA Wajib' : verifyMode ? 'Verifikasi 2FA' : 'Masuk Admin SIDPRO'}
        </CardTitle>
        <p className="text-sm text-slate-500">
          {enrollmentMode
            ? 'Kebijakan keamanan mewajibkan admin mengaktifkan 2FA sebelum masuk'
            : verifyMode
              ? 'Masukkan kode 6 digit dari aplikasi authenticator'
              : 'Platform pemerintahan desa enterprise'}
        </p>
      </CardHeader>
      <CardContent>
        {enrollmentMode ? (
          <form onSubmit={handleCompleteEnrollment} className="space-y-4">
            {enrollSetup ? (
              <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-left text-sm">
                <p className="font-medium text-slate-800">
                  Scan secret berikut di aplikasi authenticator:
                </p>
                <code className="block break-all rounded bg-white px-2 py-1 text-xs">
                  {enrollSetup.secret}
                </code>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Menyiapkan enrollment 2FA...</p>
            )}
            <div>
              <label htmlFor="enroll-totp" className="form-label">
                Kode verifikasi (6 digit)
              </label>
              <Input
                id="enroll-totp"
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
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !enrollSetup || totpCode.length < 6 || completeEnrollMutation.isPending}
            >
              {loading || completeEnrollMutation.isPending ? 'Mengaktifkan...' : 'Aktifkan 2FA & Masuk'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setEnrollmentToken(null);
                setEnrollSetup(null);
                setTotpCode('');
                setError('');
              }}
            >
              Kembali ke login
            </Button>
          </form>
        ) : verifyMode ? (
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
