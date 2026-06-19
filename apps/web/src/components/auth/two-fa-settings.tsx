'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@sidpro/ui';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  useDisableTwoFactor,
  useEnableTwoFactor,
  useSetupTwoFactor,
} from '@/features/auth/use-two-fa';

export function TwoFaSettings() {
  const { user, syncProfile } = useAuth();
  const setupMutation = useSetupTwoFactor();
  const enableMutation = useEnableTwoFactor();
  const disableMutation = useDisableTwoFactor();

  const [setupData, setSetupData] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [enableToken, setEnableToken] = useState('');
  const [disableToken, setDisableToken] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [message, setMessage] = useState('');

  const enabled = Boolean(user?.twoFaEnabled);

  async function handleSetup() {
    setMessage('');
    const data = await setupMutation.mutateAsync();
    setSetupData(data);
  }

  async function handleEnable() {
    setMessage('');
    await enableMutation.mutateAsync(enableToken);
    setSetupData(null);
    setEnableToken('');
    await syncProfile();
    setMessage('2FA berhasil diaktifkan.');
  }

  async function handleDisable() {
    setMessage('');
    await disableMutation.mutateAsync({ token: disableToken, password: disablePassword });
    setDisableToken('');
    setDisablePassword('');
    await syncProfile();
    setMessage('2FA berhasil dinonaktifkan.');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Autentikasi Dua Faktor (2FA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-slate-600">
          {enabled
            ? '2FA aktif. Login admin memerlukan kode dari aplikasi authenticator.'
            : 'Aktifkan 2FA untuk lapisan keamanan tambahan saat login admin.'}
        </p>

        {message && <p className="text-emerald-700">{message}</p>}

        {!enabled && !setupData && (
          <Button onClick={handleSetup} disabled={setupMutation.isPending}>
            {setupMutation.isPending ? 'Menyiapkan...' : 'Mulai Setup 2FA'}
          </Button>
        )}

        {setupData && !enabled && (
          <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="font-medium text-slate-800">Scan atau masukkan secret berikut di authenticator:</p>
            <code className="block break-all rounded bg-white px-2 py-1 text-xs">{setupData.secret}</code>
            <p className="text-xs text-slate-500 break-all">{setupData.otpauthUrl}</p>
            <div>
              <label className="form-label" htmlFor="enable-token">
                Kode verifikasi (6 digit)
              </label>
              <Input
                id="enable-token"
                inputMode="numeric"
                maxLength={6}
                value={enableToken}
                onChange={(e) => setEnableToken(e.target.value)}
                placeholder="123456"
              />
            </div>
            <Button onClick={handleEnable} disabled={enableMutation.isPending || enableToken.length < 6}>
              {enableMutation.isPending ? 'Mengaktifkan...' : 'Aktifkan 2FA'}
            </Button>
          </div>
        )}

        {enabled && (
          <div className="space-y-3 rounded-md border border-slate-200 p-4">
            <div>
              <label className="form-label" htmlFor="disable-token">
                Kode 2FA saat ini
              </label>
              <Input
                id="disable-token"
                inputMode="numeric"
                maxLength={6}
                value={disableToken}
                onChange={(e) => setDisableToken(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="disable-password">
                Password
              </label>
              <Input
                id="disable-password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={handleDisable}
              disabled={
                disableMutation.isPending ||
                disableToken.length < 6 ||
                disablePassword.length < 1
              }
            >
              {disableMutation.isPending ? 'Menonaktifkan...' : 'Nonaktifkan 2FA'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
