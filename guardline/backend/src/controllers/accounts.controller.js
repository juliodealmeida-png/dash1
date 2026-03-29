const { prisma } = require('../config/database');
const { ok, fail } = require('../utils/response');

async function list(req, res, next) {
  try {
    const { search, page = '1', perPage = '50' } = req.query;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const pp = Math.min(100, Math.max(1, parseInt(perPage, 10) || 50));

    let rows = [];
    let total = 0;
    try {
      const where = search
        ? { OR: [{ company: { contains: search, mode: 'insensitive' } }] }
        : {};

      const grouped = await prisma.lead.groupBy({
        by: ['company'],
        where: { company: { not: null } },
        _count: { id: true },
        _avg: { score: true },
        _max: { updatedAt: true },
        orderBy: { _max: { updatedAt: 'desc' } },
        skip: (p - 1) * pp,
        take: pp,
      });

      rows = grouped.map((g) => ({
        name: g.company,
        domain: null,
        industry: null,
        tier: null,
        leadCount: g._count.id,
        avgScore: g._avg.score ? Math.round(g._avg.score) : null,
        lastActivity: g._max.updatedAt,
      }));

      const countResult = await prisma.lead.groupBy({
        by: ['company'],
        where: { company: { not: null } },
        _count: { id: true },
      });
      total = countResult.length;
    } catch (dbErr) {
      console.warn('[accounts] DB unavailable, returning empty list:', dbErr.message);
    }

    return ok(res, rows, { total, page: p, perPage: pp });
  } catch (e) {
    next(e);
  }
}

module.exports = { list };
