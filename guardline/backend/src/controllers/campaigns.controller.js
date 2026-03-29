const { prisma } = require('../config/database');
const { emitToUser } = require('../config/socket');
const { ok, fail } = require('../utils/response');

function campaignWhere(userId) {
  return { OR: [{ ownerId: userId }, { ownerId: null }] };
}

async function list(req, res, next) {
  try {
    const { status, type, page = '1', perPage = '50' } = req.query;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const pp = Math.min(100, Math.max(1, parseInt(perPage, 10) || 50));

    const where = {
      ...campaignWhere(req.user.id),
      ...(status && { status: String(status) }),
      ...(type && { type: String(type) }),
    };

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (p - 1) * pp,
        take: pp,
        include: { _count: { select: { leads: true } } },
      }),
      prisma.campaign.count({ where }),
    ]);

    return ok(res, campaigns, { total, page: p, perPage: pp });
  } catch (e) {
    next(e);
  }
}

async function getOne(req, res, next) {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, ...campaignWhere(req.user.id) },
      include: { leads: { take: 100 } },
    });
    if (!campaign) return fail(res, 404, 'Campanha não encontrada', 'NOT_FOUND');
    return ok(res, campaign);
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    const b = req.body;
    if (!b.name || !b.type || !b.startDate) {
      return fail(res, 400, 'name, type e startDate são obrigatórios', 'VALIDATION_ERROR');
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: b.name,
        type: b.type,
        status: b.status || 'active',
        startDate: new Date(b.startDate),
        endDate: b.endDate ? new Date(b.endDate) : null,
        budget: b.budget != null ? Number(b.budget) : null,
        targetLeads: b.targetLeads != null ? parseInt(b.targetLeads, 10) : null,
        description: b.description,
        ownerId: req.user.id,
      },
      include: { _count: { select: { leads: true } } },
    });

    const io = req.app.get('io');
    if (io) emitToUser(io, req.user.id, 'campaign:created', campaign);

    return ok(res, campaign, null, 201);
  } catch (e) {
    next(e);
  }
}

async function updateFull(req, res, next) {
  try {
    const existing = await prisma.campaign.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!existing) return fail(res, 404, 'Campanha não encontrada ou sem permissão', 'NOT_FOUND');

    const b = req.body;
    const data = {};
    if (b.name !== undefined) data.name = b.name;
    if (b.type !== undefined) data.type = b.type;
    if (b.status !== undefined) data.status = b.status;
    if (b.startDate !== undefined) data.startDate = new Date(b.startDate);
    if (b.endDate !== undefined) data.endDate = b.endDate ? new Date(b.endDate) : null;
    if (b.budget !== undefined) data.budget = b.budget != null ? Number(b.budget) : null;
    if (b.targetLeads !== undefined) data.targetLeads = b.targetLeads != null ? parseInt(b.targetLeads, 10) : null;
    if (b.description !== undefined) data.description = b.description;

    const campaign = await prisma.campaign.update({
      where: { id: existing.id },
      data,
      include: { _count: { select: { leads: true } } },
    });

    const io = req.app.get('io');
    if (io) emitToUser(io, req.user.id, 'campaign:updated', campaign);

    return ok(res, campaign);
  } catch (e) {
    next(e);
  }
}

async function remove(req, res, next) {
  try {
    const existing = await prisma.campaign.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!existing) return fail(res, 404, 'Campanha não encontrada ou sem permissão', 'NOT_FOUND');

    await prisma.campaign.delete({ where: { id: existing.id } });
    const io = req.app.get('io');
    if (io) emitToUser(io, req.user.id, 'campaign:deleted', { id: existing.id });
    return ok(res, { id: existing.id, deleted: true });
  } catch (e) {
    next(e);
  }
}

async function stats(req, res, next) {
  try {
    const where = campaignWhere(req.user.id);
    const [total, byStatus, withLeads] = await Promise.all([
      prisma.campaign.count({ where }),
      prisma.campaign.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      prisma.campaign.findMany({
        where,
        select: { id: true, name: true, _count: { select: { leads: true } } },
      }),
    ]);

    const leadLinks = withLeads.reduce((s, c) => s + c._count.leads, 0);

    return ok(res, {
      totalCampaigns: total,
      byStatus: byStatus.map((g) => ({ status: g.status, count: g._count._all })),
      totalLeadAssociations: leadLinks,
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { list, getOne, create, updateFull, remove, stats };
