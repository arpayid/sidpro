import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { parseCredentialedCorsOrigins } from '../../config/cors.config';

export const REFRESH_SESSION_COOKIE = 'sidpro_refresh_session';
export const REFRESH_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const REFRESH_SESSION_PATH = '/api/v1/auth';

type SessionEnvironment = {
  nodeEnv?: string;
  corsOrigin?: string;
};

function decodeCookieValue(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function readRequestCookie(request: Pick<Request, 'headers'>, name: string): string | null {
  const header = request.headers.cookie;
  if (!header) return null;

  for (const entry of header.split(';')) {
    const separator = entry.indexOf('=');
    if (separator < 1) continue;

    const cookieName = entry.slice(0, separator).trim();
    if (cookieName !== name) continue;

    return decodeCookieValue(entry.slice(separator + 1).trim());
  }

  return null;
}

export function readRefreshSessionCookie(request: Pick<Request, 'headers'>): string {
  const token = readRequestCookie(request, REFRESH_SESSION_COOKIE);
  if (!token) {
    throw new UnauthorizedException('Sesi refresh tidak tersedia');
  }
  return token;
}

function cookieOptions(environment: SessionEnvironment) {
  return {
    httpOnly: true,
    secure: environment.nodeEnv === 'production',
    sameSite: 'lax' as const,
    path: REFRESH_SESSION_PATH,
    maxAge: REFRESH_SESSION_MAX_AGE_MS,
  };
}

export function setRefreshSessionCookie(
  response: Pick<Response, 'cookie'>,
  refreshToken: string,
  environment: SessionEnvironment,
): void {
  response.cookie(REFRESH_SESSION_COOKIE, refreshToken, cookieOptions(environment));
}

export function clearRefreshSessionCookie(
  response: Pick<Response, 'clearCookie'>,
  environment: SessionEnvironment,
): void {
  const { maxAge: _maxAge, ...options } = cookieOptions(environment);
  response.clearCookie(REFRESH_SESSION_COOKIE, options);
}

export function assertAllowedSessionOrigin(
  request: Pick<Request, 'headers'>,
  environment: SessionEnvironment,
): void {
  const origin = request.headers.origin;
  if (!origin) return;

  const allowedOrigins = parseCredentialedCorsOrigins(environment.corsOrigin, environment.nodeEnv);
  if (!allowedOrigins.includes(origin)) {
    throw new ForbiddenException('Origin sesi tidak diizinkan');
  }
}
