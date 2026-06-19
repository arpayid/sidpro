import { generateSecret, generateURI, verify, generate } from 'otplib';

const APP_NAME = 'SIDPRO';

export function generateTotpSecret(): string {
  return generateSecret();
}

export function buildTotpUri(email: string, secret: string): string {
  return generateURI({
    issuer: APP_NAME,
    label: email,
    secret,
  });
}

export async function verifyTotpToken(token: string, secret: string): Promise<boolean> {
  try {
    const result = await verify({ token, secret });
    return result.valid;
  } catch {
    return false;
  }
}

export async function generateTotpToken(secret: string): Promise<string> {
  return generate({ secret });
}
