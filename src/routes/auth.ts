import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { verifyAppleToken } from '../services/auth/apple.ts';
import { verifyGoogleToken } from '../services/auth/google.ts';
import {
  findUserByAppleId,
  findUserByGoogleId,
  findUserByEmail,
  createUser,
  linkAppleId,
  linkGoogleId,
  findUserById,
  deleteUser,
} from '../services/users.ts';
import type { AuthResponse, JWTPayload } from '../types/index.ts';

const AppleAuthSchema = z.object({
  identity_token: z.string(),
  user: z
    .object({
      email: z.string().email().optional(),
      name: z
        .object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

const GoogleAuthSchema = z.object({
  id_token: z.string(),
});

const RefreshSchema = z.object({
  refresh_token: z.string(),
});

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Apple Sign In
  fastify.post('/auth/apple', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = AppleAuthSchema.parse(request.body);

    const payload = await verifyAppleToken(body.identity_token);

    let user = findUserByAppleId(payload.sub);
    let isNewUser = false;

    if (!user) {
      const existingUser = payload.email ? findUserByEmail(payload.email) : null;

      if (existingUser) {
        linkAppleId(existingUser.id, payload.sub);
        user = existingUser;
      } else {
        const email = payload.email || body.user?.email || `${payload.sub}@privaterelay.appleid.com`;
        const displayName =
          body.user?.name?.firstName ||
          (body.user?.name?.lastName ? `${body.user.name.firstName} ${body.user.name.lastName}` : null) ||
          email.split('@')[0] ||
          'User';

        user = createUser({
          email,
          display_name: displayName,
          apple_id: payload.sub,
        });
        isNewUser = true;
      }
    }

    const tokens = generateTokens(fastify, user.id, user.email);

    const response: AuthResponse = {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        is_new_user: isNewUser,
      },
    };

    return reply.send(response);
  });

  // Google Sign In
  fastify.post('/auth/google', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = GoogleAuthSchema.parse(request.body);

    const payload = await verifyGoogleToken(body.id_token);

    let user = findUserByGoogleId(payload.sub);
    let isNewUser = false;

    if (!user) {
      const existingUser = payload.email ? findUserByEmail(payload.email) : null;

      if (existingUser) {
        linkGoogleId(existingUser.id, payload.sub);
        user = existingUser;
      } else {
        user = createUser({
          email: payload.email,
          display_name: payload.name || payload.email.split('@')[0] || 'User',
          google_id: payload.sub,
          avatar_url: payload.picture,
        });
        isNewUser = true;
      }
    }

    const tokens = generateTokens(fastify, user.id, user.email);

    const response: AuthResponse = {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        is_new_user: isNewUser,
      },
    };

    return reply.send(response);
  });

  // Refresh token
  fastify.post('/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = RefreshSchema.parse(request.body);

    try {
      const decoded = fastify.jwt.verify<JWTPayload>(body.refresh_token);
      const user = findUserById(decoded.userId);

      if (!user) {
        return reply.status(401).send({ error: 'User not found' });
      }

      const tokens = generateTokens(fastify, user.id, user.email);

      return reply.send(tokens);
    } catch {
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });

  // Logout (client should discard tokens)
  fastify.post('/auth/logout', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ success: true });
  });

  // Delete account
  fastify.delete(
    '/auth/account',
    { onRequest: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as JWTPayload;
      const deleted = deleteUser(user.userId);

      if (!deleted) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({ success: true });
    }
  );

  // Get current user
  fastify.get('/auth/me', { onRequest: [fastify.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as JWTPayload;
    const user = findUserById(payload.userId);

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      gender: user.gender,
      avatar_url: user.avatar_url,
    });
  });
}

function generateTokens(
  fastify: FastifyInstance,
  userId: string,
  email: string
): { access_token: string; refresh_token: string } {
  const payload: JWTPayload = { userId, email };

  const access_token = fastify.jwt.sign(payload, { expiresIn: '15m' });
  const refresh_token = fastify.jwt.sign(payload, { expiresIn: '30d' });

  return { access_token, refresh_token };
}
