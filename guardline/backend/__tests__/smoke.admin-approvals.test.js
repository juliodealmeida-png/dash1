const express = require('express');
const request = require('supertest');

jest.mock('../src/config/database', () => {
  const prisma = {
    user: {
      findMany: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    adminApprovalRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    integration: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    sellerProfile: {
      upsert: jest.fn(),
    },
  };
  return { prisma };
});

jest.mock('../src/middleware/rateLimiter', () => ({
  apiLimiter: (req, _res, next) => next(),
}));

jest.mock('../src/middleware/auth', () => ({
  authMiddleware: (req, _res, next) => {
    req.user = req.__testUser;
    next();
  },
}));

jest.mock('../src/services/slack.service', () => ({
  sendSlackMessage: jest.fn(async () => ({ ok: true })),
}));

const { prisma } = require('../src/config/database');

describe('smoke: admin approvals + modules', () => {
  test('admin consegue listar users', async () => {
    prisma.user.findMany.mockResolvedValueOnce([
      { id: 'u1', name: 'Admin', email: 'a@a.com', role: 'admin', modules: null, createdAt: new Date(), updatedAt: new Date() },
    ]);

    const adminRoutes = require('../src/routes/admin.routes');
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.__testUser = { id: 'admin', role: 'admin', email: 'admin@x.com', name: 'Admin' };
      next();
    });
    app.use('/api/admin', adminRoutes);

    const res = await request(app).get('/api/admin/users').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
  });

  test('non-admin é bloqueado em /api/admin/users', async () => {
    const adminRoutes = require('../src/routes/admin.routes');
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.__testUser = { id: 'u2', role: 'sdr', email: 'sdr@x.com', name: 'SDR' };
      next();
    });
    app.use('/api/admin', adminRoutes);

    const res = await request(app).get('/api/admin/users').expect(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  test('connector linkedin por non-admin cria approval e retorna 202', async () => {
    prisma.adminApprovalRequest.create.mockResolvedValueOnce({ id: 'req1' });

    const connectorsRoutes = require('../src/routes/connectors.routes');
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.__testUser = { id: 'u3', role: 'sdr', email: 'u3@x.com', name: 'User3' };
      next();
    });
    app.use('/api/connectors', connectorsRoutes);

    const res = await request(app)
      .post('/api/connectors/linkedin')
      .send({ username: 'x', password: 'y' })
      .expect(202);

    expect(res.body.success).toBe(true);
    expect(res.body.data.pending).toBe(true);
    expect(prisma.adminApprovalRequest.create).toHaveBeenCalledTimes(1);
  });

  test('admin aprova request com código e grava integração', async () => {
    prisma.adminApprovalRequest.findFirst.mockResolvedValueOnce({
      id: 'req2',
      status: 'pending',
      type: 'connector',
      targetType: 'linkedin',
      code: '123456',
      payload: JSON.stringify({ config: 'enc:v1:not-used' }),
      userId: 'u3',
    });
    prisma.integration.findFirst.mockResolvedValueOnce(null);
    prisma.integration.create.mockResolvedValueOnce({ id: 'i1' });
    prisma.adminApprovalRequest.update.mockResolvedValueOnce({ id: 'req2', status: 'approved' });

    const adminRoutes = require('../src/routes/admin.routes');
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.__testUser = { id: 'admin', role: 'admin', email: 'admin@x.com', name: 'Admin' };
      next();
    });
    app.use('/api/admin', adminRoutes);

    const res = await request(app)
      .post('/api/admin/approvals/req2/approve')
      .send({ code: '123456' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(prisma.integration.create).toHaveBeenCalledTimes(1);
    expect(prisma.adminApprovalRequest.update).toHaveBeenCalledTimes(1);
  });
});

