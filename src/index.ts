import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';

import { initDatabase, closeDatabase } from './db/index.ts';
import { healthRoutes } from './routes/health.ts';
import { authRoutes } from './routes/auth.ts';
import { userRoutes } from './routes/user.ts';
import { startPushScheduler, stopPushScheduler } from './scheduler/push-scheduler.ts';
import type { JWTPayload } from './types/index.ts';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

const PORT = parseInt(process.env['PORT'] || '3000', 10);
const HOST = process.env['HOST'] || '0.0.0.0';
const JWT_SECRET = process.env['JWT_SECRET'] || 'development-secret-change-me';

async function main(): Promise<void> {
  const fastify = Fastify({
    logger: {
      level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
    },
  });

  // Initialize database
  initDatabase();
  fastify.log.info('Database initialized');

  // Register plugins
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(cookie);

  await fastify.register(jwt, {
    secret: JWT_SECRET,
  });

  // Authentication decorator
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes, { prefix: '/api/v1' });
  await fastify.register(userRoutes, { prefix: '/api/v1' });

  // Error handler
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);

    const err = error as Error & { statusCode?: number };

    if (err.name === 'ZodError') {
      return reply.status(400).send({
        error: 'Validation error',
        details: err.message,
      });
    }

    return reply.status(err.statusCode ?? 500).send({
      error: err.message || 'Internal server error',
    });
  });

  // Start push scheduler
  if (process.env['NODE_ENV'] !== 'test') {
    startPushScheduler();
    fastify.log.info('Push scheduler started');
  }

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    fastify.log.info(`Received ${signal}, shutting down...`);
    stopPushScheduler();
    await fastify.close();
    closeDatabase();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Start server
  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Server running at http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
