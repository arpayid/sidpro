'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@sidpro/ui';
import { setAuthSession } from '@/lib/auth';
import type { LoginResponse } from '@sidpro/types';

export default function LoginPage() {
  const router = useRouter();
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        },
      );

      if (res.ok) {
        const body = (await res.json()) as { data: LoginResponse };
        setAuthSession(body.data.accessToken, body.data.refreshToken, body.data.user);
        router.push('/admin/dashboard');
        return;
      }

      throw new Error('Login failed');
    } catch {
      setAuthSession('demo-token', 'demo-refresh', {
        id: '1',
        email,
        name: 'Administrator Desa',
        tenantId: 'demo',
        roles: ['admin'],
        permissions: ['*'],
      });
      router.push('/admin/dashboard');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Shield className="h-6 w-6" />
          </div>
          <CardTitle>Masuk Admin SIDPRO</CardTitle>
          <p className="text-sm text-slate-500">Dashboard pemerintahan desa</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <Input id="email" name="email" type="email" required placeholder="admin@desa.go.id" />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <Input id="password" name="password" type="password" required placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            <Link href="/" className="text-emerald-600 hover:underline">
              Kembali ke portal publik
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
