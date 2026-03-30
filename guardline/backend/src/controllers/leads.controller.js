const { prisma } = require('../config/database');
const { emitToUser } = require('../config/socket');
const { ok, fail } = require('../utils/response');
const { calculateLeadScore } = require('../services/leadScore.service');
const { triggerAutomations } = require('../services/automation.service');
const { STAGE_PROBABILITIES } = require('./deals.constants');

function parseLeadsCsv(text) {
  const lines = String(text)
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] != null ? cells[i] : '';
    });
    return row;
  });
}

function normalizeLeadRow(row) {
  const pick = (keys, fallback = '') => {
    for (const k of keys) {
      if (row[k] != null && String(row[k]).trim()) return String(row[k]).trim();
    }
    return fallback;
  };
  return {
    name: pick(['name', 'nome', 'full_name']),
    email: pick(['email', 'e-mail', 'mail']) || null,
    phone: pick(['phone', 'telefone', 'tel']) || null,
    company: pick(['company', 'empresa', 'organization']) || null,
    jobTitle: pick(['job_title', 'cargo', 'title', 'jobtitle']) || null,
    source: pick(['source', 'fonte', 'origem']) || 'other',
  };
}

async function list(req, res, next) {
  try {
    const {
      status,
      source,
      search,
      minScore,
      maxScore,
      page = '1',
      perPage = '50',
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = req.query;

    const p = Math.max(1, parseInt(page, 10) || 1);
    const pp = Math.min(100, Math.max(1, parseInt(perPage, 10) || 50));
    const allowed = new Set(['updatedAt', 'createdAt', 'score', 'name']);
    const ob = allowed.has(sortBy) ? sortBy : 'updatedAt';
    const dir = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const where = {
      ownerId: req.user.id,
      ...(status && { status: String(status) }),
      ...(source && { source: String(source) }),
      ...(search && {
        OR: [
          { name: { contains: String(search) } },
          { email: { contains: String(search) } },
          { company: { contains: String(search) } },
        ],
      }),
    };

    if (minScore != null || maxScore != null) {
      where.score = {};
      if (minScore != null) where.score.gte = parseInt(minScore, 10);
      if (maxScore != null) where.score.lte = parseInt(maxScore, 10);
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { [ob]: dir },
        skip: (p - 1) * pp,
        take: pp,
      }),
      prisma.lead.count({ where }),
    ]);

    return ok(res, leads, { total, page: p, perPage: pp });
  } catch (e) {
    next(e);
  }
}

async function getOne(req, res, next) {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!lead) return fail(res, 404, 'Lead não encontrado', 'NOT_FOUND');
    return ok(res, lead);
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    const data = req.body;
    if (!data.name) return fail(res, 400, 'name é obrigatório', 'VALIDATION_ERROR');

    const score = calculateLeadScore(data);
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        jobTitle: data.jobTitle,
        source: data.source || 'other',
        status: 'new',
        score: score.total,
        scoreBreakdown: JSON.stringify(score.breakdown),
        notes: data.notes,
        tags: data.tags,
        ownerId: req.user.id,
      },
    });

    const signal = await prisma.signal.create({
      data: {
        type: 'lead_scored',
        severity: score.total >= 75 ? 'success' : 'info',
        title: 'Novo lead qualificado',
        message: `${lead.name} (${lead.company || 'empresa'}) · Score: ${score.total}`,
        metadata: JSON.stringify({ leadId: lead.id, score: score.total }),
      },
    });

    const io = req.app.get('io');
    if (io) {
      emitToUser(io, req.user.id, 'signal:new', signal);
      emitToUser(io, req.user.id, 'lead:created', lead);
    }

    await triggerAutomations('new_lead', { lead, io, userId: req.user.id });

    return ok(res, lead, null, 201);
  } catch (e) {
    next(e);
  }
}

async function updateFull(req, res, next) {
  try {
    const existing = await prisma.lead.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!existing) return fail(res, 404, 'Lead não encontrado', 'NOT_FOUND');

    const b = req.body;
    const data = {};
    const strFields = ['name','email','phone','company','jobTitle','source','status','notes','tags',
      'contactLinkedin','contactTitle','companyWebsite','companyIndustry','companySize',
      'companyCountry','companyLinkedin','temperature','route','replyStatus','meetingStatus',
      'nextAction','owner2'];
    strFields.forEach(function(f) { if (b[f] !== undefined) data[f] = b[f]; });
    if (b.meddpiccScore !== undefined) data.meddpiccScore = b.meddpiccScore != null ? parseInt(b.meddpiccScore, 10) : null;
    if (b.lastContactAt !== undefined) data.lastContactAt = b.lastContactAt ? new Date(b.lastContactAt) : null;
    if (b.lastActivity !== undefined) data.lastActivity = b.lastActivity ? new Date(b.lastActivity) : null;
    const jsonFields = ['intentSignals','news','linkedinPosts','timeline','scoreBreakdown'];
    jsonFields.forEach(function(f) {
      if (b[f] !== undefined) data[f] = b[f] != null ? (typeof b[f] === 'string' ? b[f] : JSON.stringify(b[f])) : null;
    });

    if (b.rescore === true || b.source !== undefined || b.email !== undefined) {
      const merged = { ...existing, ...b };
      const score = calculateLeadScore(merged);
      data.score = score.total;
      data.scoreBreakdown = JSON.stringify(score.breakdown);
    }

    const lead = await prisma.lead.update({ where: { id: existing.id }, data });
    const io = req.app.get('io');
    if (io) emitToUser(io, req.user.id, 'lead:updated', lead);
    return ok(res, lead);
  } catch (e) {
    next(e);
  }
}

async function convert(req, res, next) {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!lead) return fail(res, 404, 'Lead não encontrado', 'NOT_FOUND');
    if (lead.status === 'converted' && lead.convertedDealId) {
      return fail(res, 400, 'Lead já convertido', 'ALREADY_CONVERTED');
    }

    const b = req.body || {};
    const stage = b.stage || 'qualified';
    const deal = await prisma.$transaction(async (tx) => {
      const d = await tx.deal.create({
        data: {
          title: b.title || lead.company || lead.name,
          companyName: b.companyName || lead.company || lead.name,
          contactName: b.contactName || lead.name,
          contactEmail: b.contactEmail || lead.email,
          contactPhone: b.contactPhone || lead.phone,
          value: b.value != null ? Number(b.value) : 0,
          stage,
          source: b.source || lead.source,
          probability: STAGE_PROBABILITIES[stage] ?? 50,
          ownerId: req.user.id,
          lastContactAt: new Date(),
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: { status: 'converted', convertedDealId: d.id },
      });

      await tx.dealActivity.create({
        data: {
          dealId: d.id,
          type: 'note',
          title: 'Convertido de lead',
          note: `Lead ${lead.id}`,
          date: new Date(),
        },
      });

      return d;
    });

    const io = req.app.get('io');
    if (io) emitToUser(io, req.user.id, 'deal:created', deal);

    return ok(res, { deal, leadId: lead.id }, null, 201);
  } catch (e) {
    next(e);
  }
}

async function importCsv(req, res, next) {
  try {
    const csv = req.body.csv || req.body.text || '';
    if (!csv || typeof csv !== 'string') {
      return fail(res, 400, 'Envie { csv: "..." } com o conteúdo CSV', 'VALIDATION_ERROR');
    }

    const rows = parseLeadsCsv(csv);
    const created = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const norm = normalizeLeadRow(rows[i]);
      if (!norm.name) {
        errors.push({ line: i + 2, error: 'name ausente' });
        continue;
      }
      try {
        const score = calculateLeadScore(norm);
        const lead = await prisma.lead.create({
          data: {
            name: norm.name,
            email: norm.email,
            phone: norm.phone,
            company: norm.company,
            jobTitle: norm.jobTitle,
            source: norm.source || 'other',
            status: 'new',
            score: score.total,
            scoreBreakdown: JSON.stringify(score.breakdown),
            ownerId: req.user.id,
          },
        });
        created.push(lead);
      } catch (e) {
        errors.push({ line: i + 2, error: e.message });
      }
    }

    return ok(res, { created, errors, count: created.length });
  } catch (e) {
    next(e);
  }
}

async function enrich(req, res, next) {
  try {
    const existing = await prisma.lead.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!existing) return fail(res, 404, 'Lead não encontrado', 'NOT_FOUND');

    const b = req.body;
    const data = {};

    const strEnrich = ['contactLinkedin','contactTitle','companyWebsite','companyIndustry',
      'companySize','companyCountry','companyLinkedin','temperature','route',
      'replyStatus','meetingStatus','nextAction'];
    strEnrich.forEach(function(f) { if (b[f] != null) data[f] = b[f]; });

    if (b.meddpiccScore != null) data.meddpiccScore = parseInt(b.meddpiccScore, 10);
    if (b.lastActivity != null) data.lastActivity = new Date(b.lastActivity);

    const jsonEnrich = ['intentSignals','news','linkedinPosts','timeline'];
    jsonEnrich.forEach(function(f) {
      if (b[f] != null) data[f] = typeof b[f] === 'string' ? b[f] : JSON.stringify(b[f]);
    });

    if (b.scoreBreakdown != null) {
      data.scoreBreakdown = typeof b.scoreBreakdown === 'string' ? b.scoreBreakdown : JSON.stringify(b.scoreBreakdown);
      const sb = typeof b.scoreBreakdown === 'string' ? JSON.parse(b.scoreBreakdown) : b.scoreBreakdown;
      const vals = Object.values(sb).map(Number).filter(n => !isNaN(n));
      if (vals.length) {
        const maxVal = Math.max(...vals);
        const ratio = maxVal > 10 ? 1 : 10;
        const total = Math.min(100, Math.round(vals.reduce((a, v) => a + v, 0) / vals.length * ratio));
        data.score = total;
      }
    }

    if (b.score != null) data.score = parseInt(b.score, 10);

    const lead = await prisma.lead.update({ where: { id: existing.id }, data });
    const io = req.app.get('io');
    if (io) emitToUser(io, req.user.id, 'lead:enriched', lead);
    return ok(res, lead);
  } catch (e) {
    next(e);
  }
}

async function remove(req, res, next) {
  try {
    const existing = await prisma.lead.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!existing) return fail(res, 404, 'Lead não encontrado', 'NOT_FOUND');
    await prisma.lead.delete({ where: { id: existing.id } });
    const io = req.app.get('io');
    if (io) emitToUser(io, req.user.id, 'lead:deleted', { id: existing.id });
    return ok(res, { id: existing.id, deleted: true });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  list,
  getOne,
  create,
  updateFull,
  enrich,
  convert,
  importCsv,
  remove,
};
