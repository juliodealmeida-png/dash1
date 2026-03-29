const { ok, fail } = require('../utils/response');
const julio = require('../services/julio.service');
const { emitToUser } = require('../config/socket');

function requireJulio(res) {
  if (!julio.isConfigured()) {
    fail(res, 503, 'Julio AI não configurado', 'JULIO_NOT_CONFIGURED', {
      hint: 'Defina NVIDIA_API_KEY no .env',
    });
    return false;
  }
  return true;
}

async function postBrief(req, res, next) {
  try {
    if (!requireJulio(res)) return;
    const brief = await julio.generateDailyBrief(req.user.id);
    const io = req.app.get('io');
    if (io) emitToUser(io, req.user.id, 'julio:brief:ready', brief);
    return ok(res, brief);
  } catch (e) {
    next(e);
  }
}

async function getBriefLatest(req, res, next) {
  try {
    const row = await julio.getLatestBrief(req.user.id);
    if (!row) return ok(res, null);
    let parsed = null;
    try {
      parsed = JSON.parse(row.content);
    } catch {
      parsed = { raw: row.content };
    }
    return ok(res, { id: row.id, date: row.date, type: row.type, brief: parsed });
  } catch (e) {
    next(e);
  }
}

async function chatStream(req, res, next) {
  if (!requireJulio(res)) return;

  const { message, conversationId } = req.body;
  if (!message || typeof message !== 'string') {
    return fail(res, 400, 'message é obrigatório', 'VALIDATION_ERROR');
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  if (res.flushHeaders) res.flushHeaders();

  try {
    const result = await julio.streamJulioChat(
      req.user.id,
      conversationId || null,
      message.trim(),
      (chunk) => {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
    );
    res.write(
      `data: ${JSON.stringify({ done: true, conversationId: result.conversationId })}\n\n`
    );
    res.end();
  } catch (err) {
    if (!res.writableEnded) {
      try {
        res.write(`data: ${JSON.stringify({ error: err.message || 'Erro no Julio' })}\n\n`);
        res.end();
      } catch {
        next(err);
      }
    } else {
      next(err);
    }
  }
}

/** Chat sem stream (útil para clientes que não suportam SSE). */
async function chatSync(req, res, next) {
  try {
    if (!requireJulio(res)) return;
    const { message, conversationId } = req.body;
    if (!message) return fail(res, 400, 'message é obrigatório', 'VALIDATION_ERROR');
    const out = await julio.chatWithJulio(req.user.id, conversationId || null, String(message).trim());
    return ok(res, out);
  } catch (e) {
    next(e);
  }
}

async function listConversations(req, res, next) {
  try {
    const rows = await julio.listConversations(req.user.id, 40);
    return ok(res, rows);
  } catch (e) {
    next(e);
  }
}

async function getConversation(req, res, next) {
  try {
    const c = await julio.getConversation(req.user.id, req.params.id);
    if (!c) return fail(res, 404, 'Conversa não encontrada', 'NOT_FOUND');
    let messages = [];
    try {
      messages = JSON.parse(c.messages);
    } catch {
      messages = [];
    }
    return ok(res, { id: c.id, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt, messages });
  } catch (e) {
    next(e);
  }
}

async function postLossAnalysis(req, res, next) {
  try {
    if (!requireJulio(res)) return;
    const data = await julio.analyzeLossPatterns(req.user.id);
    return ok(res, data);
  } catch (e) {
    next(e);
  }
}

async function postInvestorUpdate(req, res, next) {
  try {
    if (!requireJulio(res)) return;
    const markdown = await julio.generateInvestorUpdate(req.user.id);
    return ok(res, { markdown });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  postBrief,
  getBriefLatest,
  chatStream,
  chatSync,
  listConversations,
  getConversation,
  postLossAnalysis,
  postInvestorUpdate,
};
