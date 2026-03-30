const { prisma } = require('../config/database');
const { broadcastToAll, emitToUser } = require('../config/socket');
const { ok, fail } = require('../utils/response');

async function listMessages(req, res, next) {
  try {
    const channel = String(req.query.channel || 'general');
    const take = Math.min(100, parseInt(req.query.take, 10) || 50);
    const messages = await prisma.forumMessage.findMany({
      where: { channel },
      orderBy: { createdAt: 'asc' },
      take,
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    return ok(res, messages);
  } catch (e) {
    next(e);
  }
}

async function createMessage(req, res, next) {
  try {
    const { content, channel } = req.body;
    if (!content || !String(content).trim()) {
      return fail(res, 400, 'content é obrigatório', 'VALIDATION_ERROR');
    }
    const msg = await prisma.forumMessage.create({
      data: {
        userId: req.user.id,
        content: String(content).trim().slice(0, 2000),
        channel: String(channel || 'general'),
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    const io = req.app.get('io');
    if (io) broadcastToAll(io, 'forum:message', msg);
    return ok(res, msg, null, 201);
  } catch (e) {
    next(e);
  }
}

async function deleteMessage(req, res, next) {
  try {
    const msg = await prisma.forumMessage.findUnique({ where: { id: req.params.id } });
    if (!msg) return fail(res, 404, 'Mensagem não encontrada', 'NOT_FOUND');
    if (msg.userId !== req.user.id && req.user.role !== 'admin') {
      return fail(res, 403, 'Sem permissão', 'FORBIDDEN');
    }
    await prisma.forumMessage.delete({ where: { id: msg.id } });
    const io = req.app.get('io');
    if (io) broadcastToAll(io, 'forum:deleted', { id: msg.id, channel: msg.channel });
    return ok(res, { id: msg.id, deleted: true });
  } catch (e) {
    next(e);
  }
}

module.exports = { listMessages, createMessage, deleteMessage };
