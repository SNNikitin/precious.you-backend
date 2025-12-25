import { OAuth2Client } from 'google-auth-library';
import type { AuthPayload } from '../../types/index.ts';

const GOOGLE_CLIENT_ID = process.env['GOOGLE_CLIENT_ID'] || '';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export async function verifyGoogleToken(idToken: string): Promise<AuthPayload> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error('Invalid Google token payload');
  }

  return {
    sub: payload.sub,
    email: payload.email || '',
    email_verified: payload.email_verified,
    name: payload.name,
    picture: payload.picture,
  };
}
