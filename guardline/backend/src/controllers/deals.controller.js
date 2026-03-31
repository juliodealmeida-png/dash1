const { prisma } = require('../config/database');
const { emitToUser } = require('../config/socket');
const { ok, fail } = require('../utils/response');
const { calculateRiskScore } = require('../services/riskScore.service');
const { triggerAutomations } = require('../services/automation.service');
const { sendDealClosedNotification } = require('../services/slack.service');
const { STAGE_PROBABILITIES, STAGE_LABELS, ALLOWED_DEAL_SORT } = require('./deals.constants');

function baseDealWhere(userId) {
  return { ownerId: userId, deletedAt: null };
}

function enrichDeal(deal) {
  const daysSinceContact = deal.lastContactAt
    ? Math.floor((Date.now() - new Date(deal.lastContactAt).getTime()) / 86400000)
    : null;
  const daysInStage = Math.floor((Date.now() - new Date(deal.stageChangedAt).getTime()) / 86400000);
  return {
    ...deal,
    daysSinceContact,
    daysInStage,
    forecastValue: deal.value * (deal.probability / 100),
  };
}

async function list(req, res, next) {
  try {
    const {
      stage,
      source,
      search,
      minValue,
      maxValue,
      minRisk,
      maxRisk,
      sortBy = 'riskScore',
      sortOrder = 'desc',
      page = '1',
      perPage = '50',
    } = req.query;

    const p = Math.max(1, parseInt(page, 10) || 1);
    const pp = Math.min(100, Math.max(1, parseInt(perPage, 10) || 50));
    const orderField = ALLOWED_DEAL_SORT.has(sortBy) ? sortBy : 'riskScore';
    const orderDir = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const where = {
      ...baseDealWhere(req.user.id),
      ...(stage && { stage: String(stage) }),
      ...(source && { source: String(source) }),
      ...(search && {
        OR: [
          { title: { contains: String(search) } },
          { companyName: { contains: String(search) } },
          { contactName: { contains: String(search) } },
        ],
      }),
    };

    if (minValue != null || maxValue != null) {
      where.value = {};
      if (minValue != null) where.value.gte = parseFloat(minValue);
      if (maxValue != null) where.value.lte = parseFloat(maxValue);
    }

    if (minRisk != null || maxRisk != null) {
      where.riskScore = {};
      if (minRisk != null) where.riskScore.gte = parseInt(minRisk, 10);
      if (maxRisk != null) where.riskScore.lte = parseInt(maxRisk, 10);
    }

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        include: {
          activities: { orderBy: { date: 'desc' }, take: 3 },
          emails: { orderBy: { receivedAt: 'desc' }, take: 2 },
          _count: { select: { activities: true, emails: true } },
        },
        orderBy: { [orderField]: orderDir },
        skip: (p - 1) * pp,
        take: pp,
      }),
      prisma.deal.count({ where }),
    ]);

    return ok(res, deals.map(enrichDeal), { total, page: p, perPage: pp });
  } catch (e) {
    next(e);
  }
}

async function getOne(req, res, next) {
  try {
    const deal = await prisma.deal.findFirst({
      where: { id: req.params.id, ...baseDealWhere(req.user.id) },
      include: {
        activities: { orderBy: { date: 'desc' } },
        emails: { orderBy: { receivedAt: 'desc' } },
        meddpiccScore: true,
        _count: { select: { activities: true, emails: true } },
      },
    });
    if (!deal) return fail(res, 404, 'Deal não encontrado', 'NOT_FOUND');
    return ok(res, enrichDeal(deal));
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    const b = req.body;
    const deal = await prisma.deal.create({
      data: {
        title: b.title || b.companyName || 'Novo deal',
        companyName: b.companyName,
        contactName: b.contactName,
        contactEmail: b.contactEmail,
        contactPhone: b.contactPhone,
        value: Number(b.value) || 0,
        stage: b.stage || 'prospecting',
        source: b.source,
        probability: b.probability != null ? Number(b.probability) : STAGE_PROBABILITIES[b.stage || 'prospecting'] ?? 50,
        riskScore: b.riskScore != null ? Number(b.riskScore) : 0,
        forecastCategory: b.forecastCategory,
        notes: b.notes,
        tags: b.tags,
        ownerId: req.user.id,
        lastContactAt: b.lastContactAt ? new Date(b.lastContactAt) : null,
        expectedCloseDate: b.expectedCloseDate ? new Date(b.expectedCloseDate) : null,
      },
      include: { _count: { select: { activities: true } } },
    });

    const risk = calculateRiskScore(deal);
    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: { riskScore: risk.score },
      include: { _count: { select: { activities: true } } },
    });

    const io = req.app.get('io');
    if (io) emitToUser(io, req.user.id, 'deal:created', updated);

    return ok(res, enrichDeal(updated), null, 201);
  } catch (e) {
    next(e);
  }
}

async function updateFull(req, res, next) {
  try {
    const existing = await prisma.deal.findFirst({
      where: { id: req.params.id, ...baseDealWhere(req.user.id) },
    });
    if (!existing) return fail(res, 404, 'Deal não encontrado', 'NOT_FOUND');

    const b = req.body;
    const data = {};
    if (b.title !== undefined) data.title = b.title;
    if (b.companyName !== undefined) data.companyName = b.companyName;
    if (b.contactName !== undefined) data.contactName = b.contactName;
    if (b.contactEmail !== undefined) data.contactEmail = b.contactEmail;
    if (b.contactPhone !== undefined) data.contactPhone = b.contactPhone;
    if (b.value !== undefined) data.value = Number(b.value);
    if (b.stage !== undefined) {
      data.stage = b.stage;
      if (b.stage !== existing.stage) data.stageChangedAt = new Date();
    }
    if (b.source !== undefined) data.source = b.source;
    if (b.probability !== undefined) data.probability = Number(b.probability);
    if (b.riskScore !== undefined) data.riskScore = Number(b.riskScore);
    if (b.forecastCategory !== undefined) data.forecastCategory = b.forecastCategory;
    if (b.expectedCloseDate !== undefined) {
      data.expectedCloseDate = b.expectedCloseDate ? new Date(b.expectedCloseDate) : null;
    }
    if (b.actualCloseDate !== undefined) {
      data.actualCloseDate = b.actualCloseDate ? new Date(b.actualCloseDate) : null;
    }
    if (b.lostReason !== undefined) data.lostReason = b.lostReason;
    if (b.lostNote !== undefined) data.lostNote = b.lostNote;
    if (b.notes !== undefined) data.notes = b.notes;
    if (b.tags !== undefined) data.tags = b.tags;
    if (b.lastContactAt !== undefined) {
      data.lastContactAt = b.lastContactAt ? new Date(b.lastContactAt) : null;
    }

    const deal = await prisma.deal.update({
      where: { id: existing.id },
      data,
      include: { _count: { select: { activities: true, emails: true } } },
    });

    const io = req.app.get('io');
    if (io) emitToUser(io, req.user.id, 'deal:updated', deal);

    return ok(res, enrichDeal(deal));
  } catch (e) {
    next(e);
  }
}

async function updateStage(req, res, next) {
  try {
    const { id } = req.params;
    const { stage, note } = req.body;

    const deal = await prisma.deal.findFirst({
      where: { id, ...baseDealWhere(req.user.id) },
    });
    if (!deal) return fail(res, 404, 'Deal não encontrado', 'NOT_FOUND');

    const previousStage = deal.stage;
    const updated = await prisma.deal.update({
      where: { id },
      data: {
        stage,
        stageChangedAt: new Date(),
        probability: STAGE_PROBABILITIES[stage] ?? deal.probability,
        ...(stage === 'won' && { actualCloseDate: new Date() }),
        ...(stage === 'lost' && { actualCloseDate: new Date() }),
      },
      include: { _count: { select: { activities: true } } },
    });

    await prisma.dealActivity.create({
      data: {
        dealId: id,
        type: 'stage_change',
        title: `Estágio alterado: ${previousStage} → ${stage}`,
        note: note || null,
        date: new Date(),
      },
    });

    const signal = await prisma.signal.create({
      data: {
        type: 'deal_advanced',
        severity: stage === 'won' ? 'success' : 'info',
        title: `Deal avançou para ${STAGE_LABELS[stage] || stage}`,
        message: `${deal.companyName} movido de ${STAGE_LABELS[previousStage] || previousStage} para ${STAGE_LABELS[stage] || stage}`,
        dealId: id,
      },
    });

    const io = req.app.get('io');
    if (io) {
      emitToUser(io, updated.ownerId, 'signal:new', signal);
      emitToUser(io, updated.ownerId, 'deal:updated', updated);
    }

    await triggerAutomations('stage_changed', {
      deal: updated,
      previousStage,
      newStage: stage,
      io,
      userId: req.user.id,
    });

    if (stage === 'won') {
      await sendDealClosedNotification(updated, req.user.name, updated.ownerId);
    }

    return ok(res, enrichDeal(updated));
  } catch (e) {
    next(e);
  }
}

async function updateRisk(req, res, next) {
  try {
    const deal = await prisma.deal.findFirst({
      where: { id: req.params.id, ...baseDealWhere(req.user.id) },
      include: { _count: { select: { activities: true } } },
    });
    if (!deal) return fail(res, 404, 'Deal não encontrado', 'NOT_FOUND');

    const { score, reasons, level } = calculateRiskScore(deal);
    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: { riskScore: score },
    });

    return ok(res, { deal: enrichDeal({ ...updated, _count: deal._count }), risk: { score, reasons, level } });
  } catch (e) {
    next(e);
  }
}

async function remove(req, res, next) {
  try {
    const existing = await prisma.deal.findFirst({
      where: { id: req.params.id, ...baseDealWhere(req.user.id) },
    });
    if (!existing) return fail(res, 404, 'Deal não encontrado', 'NOT_FOUND');

    await prisma.deal.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    const io = req.app.get('io');
    if (io) emitToUser(io, req.user.id, 'deal:deleted', { id: existing.id });

    return ok(res, { id: existing.id, deleted: true });
  } catch (e) {
    next(e);
  }
}

async function listActivities(req, res, next) {
  try {
    const deal = await prisma.deal.findFirst({
      where: { id: req.params.id, ...baseDealWhere(req.user.id) },
    });
    if (!deal) return fail(res, 404, 'Deal não encontrado', 'NOT_FOUND');

    const activities = await prisma.dealActivity.findMany({
      where: { dealId: deal.id },
      orderBy: { date: 'desc' },
    });
    return ok(res, activities);
  } catch (e) {
    next(e);
  }
}

async function createActivity(req, res, next) {
  try {
    const deal = await prisma.deal.findFirst({
      where: { id: req.params.id, ...baseDealWhere(req.user.id) },
    });
    if (!deal) return fail(res, 404, 'Deal não encontrado', 'NOT_FOUND');

    const { type, title, note, date } = req.body;
    const activity = await prisma.dealActivity.create({
      data: {
        dealId: deal.id,
        type: type || 'note',
        title: title || 'Atividade',
        note: note || null,
        date: date ? new Date(date) : new Date(),
      },
    });

    await prisma.deal.update({
      where: { id: deal.id },
      data: { lastContactAt: activity.date },
    });

    const io = req.app.get('io');
    if (io) emitToUser(io, req.user.id, 'deal:activity', { dealId: deal.id, activity });

    return ok(res, activity, null, 201);
  } catch (e) {
    next(e);
  }
}

async function pipelineStats(req, res, next) {
  try {
    const where = baseDealWhere(req.user.id);
    const grouped = await prisma.deal.groupBy({
      by: ['stage'],
      where,
      _count: { _all: true },
      _sum: { value: true },
    });

    const open = await prisma.deal.aggregate({
      where,
      _sum: { value: true },
      _count: { _all: true },
    });

    return ok(res, {
      byStage: grouped.map((g) => ({
        stage: g.stage,
        count: g._count._all,
        valueSum: g._sum.value || 0,
        label: STAGE_LABELS[g.stage] || g.stage,
      })),
      totals: {
        deals: open._count._all,
        pipelineValue: open._sum.value || 0,
      },
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  list,
  getOne,
  create,
  updateFull,
  updateStage,
  updateRisk,
  remove,
  listActivities,
  createActivity,
  pipelineStats,
};
