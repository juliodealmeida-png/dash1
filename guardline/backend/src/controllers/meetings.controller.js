const { prisma } = require('../config/database');
const { ok, fail } = require('../utils/response');

async function list(req, res, next) {
  try {
    const { page = '1', perPage = '50', status } = req.query;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const pp = Math.min(100, Math.max(1, parseInt(perPage, 10) || 50));

    let rows = [];
    let total = 0;
    try {
      const where = {};
      if (status) where.status = status;
      if (req.user && req.user.id) where.ownerId = req.user.id;

      [rows, total] = await Promise.all([
        prisma.activity.findMany({
          where: { ...where, type: { in: ['meeting', 'call', 'demo'] } },
          orderBy: { date: 'desc' },
          skip: (p - 1) * pp,
          take: pp,
          include: { deal: { select: { id: true, companyName: true } } },
        }),
        prisma.activity.count({
          where: { ...where, type: { in: ['meeting', 'call', 'demo'] } },
        }),
      ]);
    } catch (dbErr) {
      console.warn('[meetings] DB unavailable, returning empty list:', dbErr.message);
      rows = [];
      total = 0;
    }

    const mapped = rows.map((r) => ({
      id: r.id,
      title: r.title || r.type,
      company_name: r.deal ? r.deal.companyName : null,
      deal_id: r.dealId,
      status: r.status || 'scheduled',
      scheduled_at: r.date,
      notes: r.notes,
      created_at: r.createdAt,
    }));

    return ok(res, mapped, { total, page: p, perPage: pp });
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    const { title, dealId, scheduledAt, notes } = req.body;
    if (!title) return fail(res, 400, 'title obrigatório', 'VALIDATION_ERROR');

    const row = await prisma.activity.create({
      data: {
        title,
        type: 'meeting',
        date: scheduledAt ? new Date(scheduledAt) : new Date(),
        notes: notes || null,
        dealId: dealId || null,
        ownerId: req.user.id,
      },
    });
    return ok(res, row, undefined, 201);
  } catch (e) {
    next(e);
  }
}

module.exports = { list, create };
