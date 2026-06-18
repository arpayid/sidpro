'use client';

import { useState, type FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@sidpro/ui';
import { setAuthSession } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import type { LoginResponse } from '@sidpro/types';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/admin/dashboard';

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get('email') as string;
    const password = form.get('password') as string;

    try {
      const body = await apiClient<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuth: true,
      });

      if (!body.data) throw new Error('Respons login tidak valid');

      setAuthSession(body.data.accessToken, body.data.refreshToken, body.data.user);
      router.push(callbackUrl.startsWith('/admin') ? callbackUrl : '/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email atau password salah');
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
        <CardTitle className="text-lg">Masuk Admin SIDPRO</CardTitle>
        <p className="text-sm text-slate-500">Platform pemerintahan desa enterprise</p>
      </CardHeader>
      <CardContent>
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
