const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');
const { signAccessToken, signRefreshToken, verifyRefreshJwt } = require('../utils/tokens');
const { ok, fail } = require('../utils/response');

const SALT_ROUNDS = 12;

function refreshExpiresAt() {
  const raw = String(process.env.REFRESH_TOKEN_EXPIRES_IN || '30d');
  const num = parseInt(raw.replace(/\D/g, ''), 10) || 30;
  const d = new Date();
  d.setDate(d.getDate() + num);
  return d;
}

async function register(req, res, next) {
  try {
    const { email, password, name, company, role } = req.body;
    if (!email || !password || !name) {
      return fail(res, 400, 'email, password e name são obrigatórios', 'VALIDATION_ERROR');
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return fail(res, 409, 'E-mail já cadastrado', 'EMAIL_TAKEN');

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hash,
        name,
        company: company || null,
        role: ['founder', 'sdr', 'admin'].includes(role) ? role : 'founder',
      },
    });

    const { password: _pw, ...safe } = user;
    const refreshToken = signRefreshToken(user.id);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: refreshExpiresAt() },
    });
    const accessToken = signAccessToken(user);

    return ok(
      res,
      { user: safe, accessToken, refreshToken },
      null,
      201
    );
  } catch (e) {
    next(e);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return fail(res, 400, 'Email e senha são obrigatórios', 'VALIDATION_ERROR');
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return fail(res, 401, 'Credenciais inválidas', 'INVALID_CREDENTIALS');
    }

    const { password: _pw, ...userWithoutPassword } = user;
    const refreshToken = signRefreshToken(user.id);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: refreshExpiresAt() },
    });
    const accessToken = signAccessToken(user);

    return ok(res, { user: userWithoutPassword, accessToken, refreshToken });
  } catch (e) {
    next(e);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return fail(res, 400, 'refreshToken é obrigatório', 'VALIDATION_ERROR');

    let payload;
    try {
      payload = verifyRefreshJwt(refreshToken);
    } catch {
      return fail(res, 401, 'Refresh token inválido ou expirado', 'TOKEN_INVALID');
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      return fail(res, 401, 'Refresh token revogado ou expirado', 'TOKEN_REVOKED');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, company: true, role: true, avatar: true },
    });
    if (!user) return fail(res, 401, 'Usuário não encontrado', 'USER_NOT_FOUND');

    const accessToken = signAccessToken(user);
    return ok(res, { accessToken, user });
  } catch (e) {
    next(e);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    return ok(res, { loggedOut: true });
  } catch (e) {
    next(e);
  }
}

async function me(req, res) {
  return ok(res, { user: req.user });
}

module.exports = { register, login, refresh, logout, me };
