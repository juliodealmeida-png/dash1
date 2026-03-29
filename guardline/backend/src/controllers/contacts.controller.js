const { prisma } = require('../config/database');
const { ok, fail } = require('../utils/response');

async function list(req, res, next) {
  try {
    const { search, page = '1', perPage = '50' } = req.query;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const pp = Math.min(100, Math.max(1, parseInt(perPage, 10) || 50));

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    let rows = [];
    let total = 0;
    try {
      [rows, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: (p - 1) * pp,
          take: pp,
          select: {
            id: true, name: true, email: true, phone: true, company: true,
            jobTitle: true, source: true, score: true, status: true,
            assignedTo: true, lastContactAt: true, createdAt: true, updatedAt: true,
          },
        }),
        prisma.lead.count({ where }),
      ]);
    } catch (dbErr) {
      console.warn('[contacts] DB unavailable, returning empty list:', dbErr.message);
    }

    return ok(res, rows, { total, page: p, perPage: pp });
  } catch (e) {
    next(e);
  }
}

async function getOne(req, res, next) {
  try {
    const row = await prisma.lead.findFirst({ where: { id: req.params.id } });
    if (!row) return fail(res, 404, 'Contato não encontrado', 'NOT_FOUND');
    return ok(res, row);
  } catch (e) {
    next(e);
  }
}

module.exports = { list, getOne };
