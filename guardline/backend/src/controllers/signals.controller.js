const { prisma } = require('../config/database');
const { ok, fail } = require('../utils/response');

async function list(req, res, next) {
  try {
    const take = Math.min(Number(req.query.take) || 50, 200);
    const unreadOnly = req.query.unread === '1' || req.query.unread === 'true';

    const signals = await prisma.signal.findMany({
      where: unreadOnly ? { read: false } : {},
      orderBy: { createdAt: 'desc' },
      take,
      include: { deal: { select: { id: true, companyName: true, value: true } } },
    });
    return ok(res, signals);
  } catch (e) {
    next(e);
  }
}

async function markRead(req, res, next) {
  try {
    const updated = await prisma.signal.updateMany({
      where: { id: req.params.id },
      data: { read: true },
    });
    if (!updated.count) return fail(res, 404, 'Sinal não encontrado', 'NOT_FOUND');
    return ok(res, { id: req.params.id, read: true });
  } catch (e) {
    next(e);
  }
}

async function markAllRead(req, res, next) {
  try {
    const result = await prisma.signal.updateMany({
      where: { read: false },
      data: { read: true },
    });
    return ok(res, { updated: result.count });
  } catch (e) {
    next(e);
  }
}

module.exports = { list, markRead, markAllRead };
