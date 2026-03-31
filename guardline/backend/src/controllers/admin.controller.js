const { prisma } = require('../config/database');
const { ok, fail } = require('../utils/response');
const { decryptJson } = require('../utils/cryptoConfig');

async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        role: true,
        modules: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return ok(res, users);
  } catch (e) {
    next(e);
  }
}

async function updateUserModules(req, res, next) {
  try {
    const userId = String(req.params.id || '');
    if (!userId) return fail(res, 400, 'userId é obrigatório', 'VALIDATION_ERROR');

    const modules = req.body?.modules;
    let value = null;
    if (Array.isArray(modules)) {
      value = JSON.stringify(modules.map((s) => String(s)));
    } else if (modules === null) {
      value = null;
    } else if (typeof modules === 'string') {
      const trimmed = modules.trim();
      value = trimmed ? trimmed : null;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { modules: value },
      select: { id: true, email: true, name: true, role: true, modules: true },
    });
    return ok(res, updated);
  } catch (e) {
    next(e);
  }
}

async function listApprovals(req, res, next) {
  try {
    const status = String(req.query.status || 'pending');
    const take = Math.min(Number(req.query.take) || 50, 200);
    const rows = await prisma.adminApprovalRequest.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: { select: { id: true, name: true, email: true, role: true, company: true } },
        decidedBy: { select: { id: true, name: true, email: true } },
      },
    });
    return ok(res, rows);
  } catch (e) {
    next(e);
  }
}

async function approveRequest(req, res, next) {
  try {
    const id = String(req.params.id || '');
    const code = String(req.body?.code || '').trim();
    if (!id) return fail(res, 400, 'id é obrigatório', 'VALIDATION_ERROR');
    if (!code) return fail(res, 400, 'code é obrigatório', 'VALIDATION_ERROR');

    const reqRow = await prisma.adminApprovalRequest.findFirst({
      where: { id, status: 'pending' },
    });
    if (!reqRow) return fail(res, 404, 'Solicitação não encontrada', 'NOT_FOUND');
    if (reqRow.code !== code) return fail(res, 401, 'Código inválido', 'INVALID_CODE');

    const payload = decryptJson(reqRow.payload) || {};

    if (reqRow.type === 'connector') {
      const type = reqRow.targetType;
      const config = payload.config;
      if (!type || !config) return fail(res, 400, 'Payload inválido', 'INVALID_PAYLOAD');

      const existing = await prisma.integration.findFirst({
        where: { type, userId: reqRow.userId },
      });
      if (existing) {
        await prisma.integration.update({
          where: { id: existing.id },
          data: { status: 'connected', config, errorMessage: null, updatedAt: new Date() },
        });
      } else {
        await prisma.integration.create({
          data: {
            type,
            status: 'connected',
            config,
            userId: reqRow.userId,
            metadata: JSON.stringify({ approvedAt: new Date().toISOString(), approvedBy: req.user.id }),
          },
        });
      }
    } else if (reqRow.type === 'profile_change') {
      const update = payload.update || {};
      await prisma.sellerProfile.upsert({
        where: { userId: reqRow.userId },
        update: {
          ...(update.linkedinUrl !== undefined && { linkedinUrl: String(update.linkedinUrl).trim() || null }),
          ...(update.calendarUrl !== undefined && { calendarUrl: String(update.calendarUrl).trim() || null }),
          ...(update.n8nWebhookPath !== undefined && { n8nWebhookPath: String(update.n8nWebhookPath).trim() || null }),
        },
        create: {
          userId: reqRow.userId,
          linkedinUrl: update.linkedinUrl ? String(update.linkedinUrl).trim() : null,
          calendarUrl: update.calendarUrl ? String(update.calendarUrl).trim() : null,
          n8nWebhookPath: update.n8nWebhookPath ? String(update.n8nWebhookPath).trim() : null,
          timezone: 'America/Sao_Paulo',
        },
      });
    }

    const updated = await prisma.adminApprovalRequest.update({
      where: { id: reqRow.id },
      data: {
        status: 'approved',
        decidedById: req.user.id,
        decidedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return ok(res, updated);
  } catch (e) {
    next(e);
  }
}

async function rejectRequest(req, res, next) {
  try {
    const id = String(req.params.id || '');
    if (!id) return fail(res, 400, 'id é obrigatório', 'VALIDATION_ERROR');
    const reqRow = await prisma.adminApprovalRequest.findFirst({
      where: { id, status: 'pending' },
    });
    if (!reqRow) return fail(res, 404, 'Solicitação não encontrada', 'NOT_FOUND');

    const updated = await prisma.adminApprovalRequest.update({
      where: { id: reqRow.id },
      data: {
        status: 'rejected',
        decidedById: req.user.id,
        decidedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return ok(res, updated);
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listUsers,
  updateUserModules,
  listApprovals,
  approveRequest,
  rejectRequest,
};

