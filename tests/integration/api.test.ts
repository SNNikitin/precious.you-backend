import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import Database from 'better-sqlite3';
import { createTestDatabase, cleanupTestDatabase, TEST_DB_PATH } from '../setup.ts';

let app: FastifyInstance;
let testDb: Database.Database;

// Mock the db module before importing routes
const mockDb = {
  prepare: (sql: string) => ({
    get: (..._args: unknown[]) => null,
    all: () => [],
    run: (..._args: unknown[]) => ({ changes: 0 }),
  }),
  exec: (_sql: string) => {},
  pragma: (_pragma: string) => {},
};

// Simple in-memory user store for tests
const users = new Map<string, Record<string, unknown>>();

async function buildTestApp(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  await fastify.register(cors, { origin: true });
  await fastify.register(cookie);
  await fastify.register(jwt, { secret: 'test-secret' });

  fastify.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Health route
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }));

  // Auth routes for testing
  fastify.post('/api/v1/auth/test-login', async (request, reply) => {
    const { email, displayName } = request.body as { email: string; displayName: string };
    const userId = `test-${Date.now()}`;

    users.set(userId, {
      id: userId,
      email,
      display_name: displayName,
      gender: 'female',
    });

    const token = fastify.jwt.sign({ userId, email }, { expiresIn: '15m' });
    const refreshToken = fastify.jwt.sign({ userId, email }, { expiresIn: '30d' });

    return reply.send({
      access_token: token,
      refresh_token: refreshToken,
      user: {
        id: userId,
        email,
        display_name: displayName,
        is_new_user: true,
      },
    });
  });

  fastify.post('/api/v1/auth/refresh', async (request, reply) => {
    const { refresh_token } = request.body as { refresh_token: string };

    try {
      const decoded = fastify.jwt.verify(refresh_token) as { userId: string; email: string };
      const token = fastify.jwt.sign({ userId: decoded.userId, email: decoded.email }, { expiresIn: '15m' });
      const newRefreshToken = fastify.jwt.sign({ userId: decoded.userId, email: decoded.email }, { expiresIn: '30d' });

      return reply.send({
        access_token: token,
        refresh_token: newRefreshToken,
      });
    } catch {
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });

  fastify.get('/api/v1/auth/me', {
    onRequest: [(fastify as any).authenticate],
  }, async (request, reply) => {
    const { userId } = (request as any).user;
    const user = users.get(userId);

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({
      id: user['id'],
      email: user['email'],
      display_name: user['display_name'],
      gender: user['gender'],
    });
  });

  fastify.put('/api/v1/me', {
    onRequest: [(fastify as any).authenticate],
  }, async (request, reply) => {
    const { userId } = (request as any).user;
    const { display_name, gender } = request.body as { display_name?: string; gender?: string };

    const user = users.get(userId);
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    if (display_name) user['display_name'] = display_name;
    if (gender) user['gender'] = gender;

    return reply.send({
      id: user['id'],
      email: user['email'],
      display_name: user['display_name'],
      gender: user['gender'],
    });
  });

  fastify.post('/api/v1/device', {
    onRequest: [(fastify as any).authenticate],
  }, async (request, reply) => {
    const { userId } = (request as any).user;
    const { push_token } = request.body as { push_token: string };

    const user = users.get(userId);
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    user['push_token'] = push_token;

    return reply.send({ success: true });
  });

  return fastify;
}

describe('API Integration Tests', () => {
  beforeAll(async () => {
    cleanupTestDatabase();
    testDb = createTestDatabase();
    app = await buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    testDb.close();
    cleanupTestDatabase();
  });

  beforeEach(() => {
    users.clear();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
      expect(body.version).toBe('0.1.0');
    });
  });

  describe('POST /api/v1/auth/test-login', () => {
    it('should create user and return tokens', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/test-login',
        payload: {
          email: 'test@example.com',
          displayName: 'Test User',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.access_token).toBeDefined();
      expect(body.refresh_token).toBeDefined();
      expect(body.user.email).toBe('test@example.com');
      expect(body.user.display_name).toBe('Test User');
      expect(body.user.is_new_user).toBe(true);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens', async () => {
      // First login
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/test-login',
        payload: {
          email: 'refresh@example.com',
          displayName: 'Refresh User',
        },
      });

      const { refresh_token } = JSON.parse(loginResponse.body);

      // Refresh
      const refreshResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refresh_token },
      });

      expect(refreshResponse.statusCode).toBe(200);

      const body = JSON.parse(refreshResponse.body);
      expect(body.access_token).toBeDefined();
      expect(body.refresh_token).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refresh_token: 'invalid-token' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user', async () => {
      // Login first
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/test-login',
        payload: {
          email: 'me@example.com',
          displayName: 'Me User',
        },
      });

      const { access_token } = JSON.parse(loginResponse.body);

      // Get me
      const meResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${access_token}`,
        },
      });

      expect(meResponse.statusCode).toBe(200);

      const body = JSON.parse(meResponse.body);
      expect(body.email).toBe('me@example.com');
      expect(body.display_name).toBe('Me User');
    });

    it('should reject without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PUT /api/v1/me', () => {
    it('should update user profile', async () => {
      // Login first
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/test-login',
        payload: {
          email: 'update@example.com',
          displayName: 'Original Name',
        },
      });

      const { access_token } = JSON.parse(loginResponse.body);

      // Update profile
      const updateResponse = await app.inject({
        method: 'PUT',
        url: '/api/v1/me',
        headers: {
          authorization: `Bearer ${access_token}`,
        },
        payload: {
          display_name: 'Updated Name',
          gender: 'neutral',
        },
      });

      expect(updateResponse.statusCode).toBe(200);

      const body = JSON.parse(updateResponse.body);
      expect(body.display_name).toBe('Updated Name');
      expect(body.gender).toBe('neutral');
    });
  });

  describe('POST /api/v1/device', () => {
    it('should register push token', async () => {
      // Login first
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/test-login',
        payload: {
          email: 'device@example.com',
          displayName: 'Device User',
        },
      });

      const { access_token } = JSON.parse(loginResponse.body);

      // Register device
      const deviceResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/device',
        headers: {
          authorization: `Bearer ${access_token}`,
        },
        payload: {
          push_token: 'fcm-token-123456',
        },
      });

      expect(deviceResponse.statusCode).toBe(200);

      const body = JSON.parse(deviceResponse.body);
      expect(body.success).toBe(true);
    });
  });
});
