const { prisma } = require('../config/database');
const { emitToUser } = require('../config/socket');
const { ok, fail } = require('../utils/response');

const KANBAN_STAGES = [
  'cold_outreach',
  'first_meeting',
  'interest_confirmed',
  'term_sheet',
  'due_diligence',
  'closed',
];

function investorWhere(userId) {
  return { OR: [{ ownerId: userId }, { ownerId: null }] };
}

async function list(req, res, next) {
  try {
    const { stage, status, page = '1', perPage = '50' } = req.query;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const pp = Math.min(100, Math.max(1, parseInt(perPage, 10) || 50));

    const where = {
      ...investorWhere(req.user.id),
      ...(stage && { stage: String(stage) }),
      ...(status && { status: String(status) }),
    };

    const [investorDeals, total] = await Promise.all([
      prisma.investorDeal.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (p - 1) * pp,
        take: pp,
      }),
      prisma.investorDeal.count({ where }),
    ]);

    return ok(res, investorDeals, { total, page: p, perPage: pp });
  } catch (e) {
    next(e);
  }
}

async function kanban(req, res, next) {
  try {
    const where = investorWhere(req.user.id);
    const all = await prisma.investorDeal.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    const columns = {};
    KANBAN_STAGES.forEach((s) => {
      columns[s] = [];
    });
    all.forEach((d) => {
      const key = KANBAN_STAGES.includes(d.stage) ? d.stage : 'cold_outreach';
      columns[key].push(d);
    });

    return ok(res, { stages: KANBAN_STAGES, columns });
  } catch (e) {
    next(e);
  }
}

async function getOne(req, res, next) {
  try {
    const deal = await prisma.investorDeal.findFirst({
      where: { id: req.params.id, ...investorWhere(req.user.id) },
    });
    if (!deal) return fail(res, 404, 'Investidor não encontrado', 'NOT_FOUND');
    return ok(res, deal);
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    const b = req.body;
    if (!b.investorName) {
      return fail(res, 400, 'investorName é obrigatório', 'VALIDATION_ERROR');
    }

    const deal = await prisma.investorDeal.create({
      data: {
        investorName: b.investorName,
        firm: b.firm,
        type: b.type || 'vc',
        ticketMin: b.ticketMin != null ? Number(b.ticketMin) : null,
        ticketMax: b.ticketMax != null ? Number(b.ticketMax) : null,
        contactName: b.contactName,
        contactEmail: b.contactEmail,
        stage: b.stage || 'cold_outreach',
        status: b.status || 'active',
        probability: b.probability != null ? parseInt(b.probability, 10) : 20,
        notes: b.notes,
        lastContactAt: b.lastContactAt ? new Date(b.lastContactAt) : null,
        nextMeeting: b.nextMeeting ? new Date(b.nextMeeting) : null,
        ownerId: req.user.id,
      },
    });

    const io = req.app.get('io');
    if (io) emitToUser(io, req.user.id, 'investor:created', deal);

    return ok(res, deal, null, 201);
  } catch (e) {
    next(e);
  }
}

async function updateFull(req, res, next) {
  try {
    const existing = await prisma.investorDeal.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!existing) return fail(res, 404, 'Registro não encontrado ou sem permissão', 'NOT_FOUND');

    const b = req.body;
    const data = {};
    if (b.investorName !== undefined) data.investorName = b.investorName;
    if (b.firm !== undefined) data.firm = b.firm;
    if (b.type !== undefined) data.type = b.type;
    if (b.ticketMin !== undefined) data.ticketMin = b.ticketMin != null ? Number(b.ticketMin) : null;
    if (b.ticketMax !== undefined) data.ticketMax = b.ticketMax != null ? Number(b.ticketMax) : null;
    if (b.contactName !== undefined) data.contactName = b.contactName;
    if (b.contactEmail !== undefined) data.contactEmail = b.contactEmail;
    if (b.stage !== undefined) data.stage = b.stage;
    if (b.status !== undefined) data.status = b.status;
    if (b.probability !== undefined) data.probability = parseInt(b.probability, 10);
    if (b.notes !== undefined) data.notes = b.notes;
    if (b.lastContactAt !== undefined) {
      data.lastContactAt = b.lastContactAt ? new Date(b.lastContactAt) : null;
    }
    if (b.nextMeeting !== undefined) {
      data.nextMeeting = b.nextMeeting ? new Date(b.nextMeeting) : null;
    }

    const deal = await prisma.investorDeal.update({
      where: { id: existing.id },
      data,
    });

    const io = req.app.get('io');
    if (io) emitToUser(io, req.user.id, 'investor:updated', deal);

    return ok(res, deal);
  } catch (e) {
    next(e);
  }
}

async function remove(req, res, next) {
  try {
    const existing = await prisma.investorDeal.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!existing) return fail(res, 404, 'Registro não encontrado ou sem permissão', 'NOT_FOUND');
    await prisma.investorDeal.delete({ where: { id: existing.id } });
    return ok(res, { id: existing.id, deleted: true });
  } catch (e) {
    next(e);
  }
}

module.exports = { list, kanban, getOne, create, updateFull, remove };
