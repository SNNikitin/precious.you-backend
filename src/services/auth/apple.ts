import appleSignin from 'apple-signin-auth';
import type { AuthPayload } from '../../types/index.ts';

const APPLE_CLIENT_ID = process.env['APPLE_CLIENT_ID'] || '';

export async function verifyAppleToken(identityToken: string): Promise<AuthPayload> {
  const payload = await appleSignin.verifyIdToken(identityToken, {
    audience: APPLE_CLIENT_ID,
    ignoreExpiration: false,
  });

  return {
    sub: payload.sub,
    email: payload.email || '',
    email_verified: payload.email_verified === 'true' || payload.email_verified === true,
  };
}
