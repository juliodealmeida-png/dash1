const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { prisma } = require('./database');

/**
 * @param {import('http').Server} httpServer
 */
function initSocket(httpServer) {
  const extraOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  function socketOrigin(origin, callback) {
    if (!origin) return callback(null, true);
    try {
      const host = new URL(origin).hostname;
      if (host === 'localhost' || host === '127.0.0.1') return callback(null, true);
      if (host.endsWith('.pages.dev') || host.endsWith('.netlify.app') ||
          host.endsWith('.railway.app') || host.endsWith('.up.railway.app')) return callback(null, true);
    } catch (e) { return callback(null, false); }
    if (extraOrigins.includes(origin)) return callback(null, true);
    callback(null, false);
  }

  const io = new Server(httpServer, {
    cors: {
      origin: socketOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  const optionalAuth = process.env.SOCKET_AUTH_OPTIONAL === 'true';

  io.use((socket, next) => {
    if (optionalAuth) {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization &&
          String(socket.handshake.headers.authorization).split(' ')[1]);
      if (!token) {
        socket.userId = null;
        return next();
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
      } catch {
        socket.userId = null;
      }
      return next();
    }

    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization &&
        String(socket.handshake.headers.authorization).replace(/^Bearer\s+/i, ''));

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.emit('connected', { ok: true, socketId: socket.id, userId: socket.userId || null });

    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`   [socket] user ${socket.userId} → room user:${socket.userId}`);
      }
    }

    socket.on('ping', () => socket.emit('pong', { t: Date.now() }));

    socket.on('deal:view', () => {});

    socket.on('signal:read', async (payload) => {
      try {
        const signalId = payload && payload.signalId;
        if (!signalId || !socket.userId) return;
        await prisma.signal.updateMany({ where: { id: signalId }, data: { read: true } });
        const unreadCount = await prisma.signal.count({ where: { read: false } });
        emitToUser(io, socket.userId, 'signals:update', { unreadCount });
      } catch (e) {
        console.error('[socket] signal:read', e);
      }
    });

    socket.on('signals:read:all', async () => {
      try {
        if (!socket.userId) return;
        await prisma.signal.updateMany({ where: { read: false }, data: { read: true } });
        const unreadCount = await prisma.signal.count({ where: { read: false } });
        emitToUser(io, socket.userId, 'signals:update', { unreadCount });
      } catch (e) {
        console.error('[socket] signals:read:all', e);
      }
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

/**
 * @param {import('socket.io').Server} io
 * @param {string} userId
 * @param {string} event
 * @param {unknown} payload
 */
function emitToUser(io, userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, payload);
}

function broadcastToAll(io, event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

module.exports = { initSocket, emitToUser, broadcastToAll };
