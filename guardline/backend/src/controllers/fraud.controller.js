const { prisma } = require('../config/database');
const { broadcastToAll } = require('../config/socket');
const { ok, fail } = require('../utils/response');

async function list(req, res, next) {
  try {
    const {
      severity,
      status: st,
      limit = '100',
      page = '1',
      perPage,
    } = req.query;

    const take = Math.min(
      500,
      perPage != null ? parseInt(perPage, 10) || 50 : Math.min(parseInt(limit, 10) || 100, 500)
    );
    const p = Math.max(1, parseInt(page, 10) || 1);

    const where = {
      ...(severity && { severity: String(severity) }),
      ...(st && { status: String(st) }),
    };

    const [events, total] = await Promise.all([
      prisma.fraudEvent.findMany({
        where,
        orderBy: { detectedAt: 'desc' },
        skip: (p - 1) * take,
        take,
      }),
      prisma.fraudEvent.count({ where }),
    ]);

    return ok(res, events, { total, page: p, perPage: take });
  } catch (e) {
    next(e);
  }
}

async function getOne(req, res, next) {
  try {
    const event = await prisma.fraudEvent.findUnique({ where: { id: req.params.id } });
    if (!event) return fail(res, 404, 'Evento não encontrado', 'NOT_FOUND');
    return ok(res, event);
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    const b = req.body;
    if (b.lat == null || b.lng == null || !b.type || b.amount == null || !b.severity) {
      return fail(res, 400, 'lat, lng, type, amount e severity são obrigatórios', 'VALIDATION_ERROR');
    }

    const event = await prisma.fraudEvent.create({
      data: {
        externalId: b.externalId,
        lat: Number(b.lat),
        lng: Number(b.lng),
        city: b.city,
        country: b.country,
        type: b.type,
        amount: Number(b.amount),
        currency: b.currency || 'USD',
        severity: b.severity,
        status: b.status || 'detected',
        riskScore: b.riskScore != null ? parseInt(b.riskScore, 10) : 50,
        sourceIp: b.sourceIp,
        merchantName: b.merchantName,
        notes: b.notes,
      },
    });

    const io = req.app.get('io');
    if (io) broadcastToAll(io, 'fraud:new', event);

    return ok(res, event, null, 201);
  } catch (e) {
    next(e);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status, notes } = req.body;
    if (!status) return fail(res, 400, 'status é obrigatório', 'VALIDATION_ERROR');

    const existing = await prisma.fraudEvent.findUnique({ where: { id: req.params.id } });
    if (!existing) return fail(res, 404, 'Evento não encontrado', 'NOT_FOUND');

    const event = await prisma.fraudEvent.update({
      where: { id: existing.id },
      data: {
        status,
        notes: notes !== undefined ? notes : undefined,
        resolvedAt: ['blocked', 'confirmed', 'false_positive'].includes(status) ? new Date() : existing.resolvedAt,
      },
    });

    const io = req.app.get('io');
    if (io) broadcastToAll(io, 'fraud:updated', event);

    return ok(res, event);
  } catch (e) {
    next(e);
  }
}

async function stats(req, res, next) {
  try {
    const [total, bySeverity, byStatus, amountSum] = await Promise.all([
      prisma.fraudEvent.count(),
      prisma.fraudEvent.groupBy({
        by: ['severity'],
        _count: { _all: true },
      }),
      prisma.fraudEvent.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.fraudEvent.aggregate({ _sum: { amount: true } }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fraudToday = await prisma.fraudEvent.count({
      where: { detectedAt: { gte: today } },
    });

    return ok(res, {
      total,
      fraudToday,
      bySeverity: bySeverity.map((g) => ({ severity: g.severity, count: g._count._all })),
      byStatus: byStatus.map((g) => ({ status: g.status, count: g._count._all })),
      amountTotal: amountSum._sum.amount || 0,
    });
  } catch (e) {
    next(e);
  }
}

async function remove(req, res, next) {
  try {
    const existing = await prisma.fraudEvent.findUnique({ where: { id: req.params.id } });
    if (!existing) return fail(res, 404, 'Evento não encontrado', 'NOT_FOUND');
    await prisma.fraudEvent.delete({ where: { id: existing.id } });
    return ok(res, { id: existing.id, deleted: true });
  } catch (e) {
    next(e);
  }
}

module.exports = { list, getOne, create, updateStatus, stats, remove };
