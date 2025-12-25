import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { findUserById, updateUser } from '../services/users.ts';
import { sendPush } from '../services/push.ts';
import { getRandomMessage, personalizeMessage } from '../data/messages.ts';
import type { JWTPayload, Gender } from '../types/index.ts';

const UpdateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  gender: z.enum(['female', 'male', 'neutral'] as const).optional(),
});

const RegisterDeviceSchema = z.object({
  push_token: z.string(),
  push_enabled: z.boolean().optional(),
});

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // Update profile
  fastify.put('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as JWTPayload;
    const body = UpdateProfileSchema.parse(request.body);

    const user = updateUser(payload.userId, body);

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

  // Register device for push notifications
  fastify.post('/device', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as JWTPayload;
    const body = RegisterDeviceSchema.parse(request.body);

    const user = updateUser(payload.userId, {
      push_token: body.push_token,
      push_enabled: body.push_enabled ?? true,
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({ success: true });
  });

  // Send test push notification
  fastify.post('/push/test', async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as JWTPayload;
    const user = findUserById(payload.userId);

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    if (!user.push_token) {
      return reply.status(400).send({ error: 'No push token registered' });
    }

    const message = getRandomMessage(user.gender as Gender);
    const text = personalizeMessage(message.text, user.display_name);

    const sent = await sendPush(user.push_token, {
      title: 'precious.you',
      body: text,
      data: { messageId: message.id },
    });

    return reply.send({ success: sent, message: text });
  });
}
