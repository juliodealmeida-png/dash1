const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');
const { signAccessToken, signRefreshToken, verifyRefreshJwt } = require('../utils/tokens');
const { ok, fail } = require('../utils/response');

const SALT_ROUNDS = 12;

// In-memory store for password reset tokens { token -> { userId, email, expiresAt } }
const resetTokenStore = new Map();

const DEFAULT_AUTOMATION_RECIPES = [
  {
    name: 'Follow-up após mudança de estágio',
    description: 'Cria uma task automática após mudança de estágio no pipeline.',
    trigger: 'stage_changed',
    actions: JSON.stringify([
      { type: 'create_task', title: 'Follow-up: {company}', note: 'Verificar próximos passos e agendar call.', daysFromNow: 2 },
    ]),
    active: true,
  },
  {
    name: 'Celebração no Slack (ganho)',
    description: 'Dispara em stage_changed; combine com filtro no n8n para won apenas.',
    trigger: 'stage_changed',
    actions: JSON.stringify([{ type: 'send_slack', message: '🎉 Deal avançou: {company} — bom trabalho, time!' }]),
    config: JSON.stringify({ targetStage: 'won' }),
    active: true,
  },
  {
    name: 'Webhook n8n — pipeline',
    trigger: 'stage_changed',
    actions: JSON.stringify([{ type: 'n8n_webhook', webhookPath: 'guardline-stage-changed' }]),
    config: JSON.stringify({}),
    active: true,
  },
  {
    name: 'Novo lead → Slack',
    trigger: 'new_lead',
    actions: JSON.stringify([{ type: 'send_slack', message: '✨ Novo lead na fila: {company} — qualificar nas próximas 2h.' }]),
    active: true,
  },
  {
    name: 'Novo lead → n8n',
    trigger: 'new_lead',
    actions: JSON.stringify([{ type: 'n8n_webhook', webhookPath: 'guardline-new-lead' }]),
    active: true,
  },
  {
    name: 'Boas-vindas lead (Slack)',
    trigger: 'new_lead',
    actions: JSON.stringify([{ type: 'send_slack', message: '📥 Lead capturado — origem registrada no CRM (Guardline).' }]),
    active: true,
  },
];

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function pruneExpiredResetTokens() {
  const now = Date.now();
  for (const [token, data] of resetTokenStore.entries()) {
    if (data.expiresAt < now) resetTokenStore.delete(token);
  }
}

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

    try {
      await prisma.automationRecipe.createMany({
        data: DEFAULT_AUTOMATION_RECIPES.map((r) => ({ ...r, ownerId: user.id })),
      });
    } catch (_) {}

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

async function forgotPassword(req, res, next) {
  try {
    pruneExpiredResetTokens();
    const { email } = req.body;
    if (!email) return fail(res, 400, 'E-mail obrigatório', 'VALIDATION_ERROR');

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always return ok to avoid user enumeration
    if (!user) return ok(res, { message: 'Se o e-mail existir, um link de redefinição foi enviado.' });

    const token = generateResetToken();
    resetTokenStore.set(token, { userId: user.id, email: user.email, expiresAt: Date.now() + 3600000 });

    const isDev = process.env.NODE_ENV !== 'production';
    const resetUrl = `${process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3001'}/reset-password?token=${token}`;

    if (isDev) {
      return ok(res, { message: 'Link de redefinição gerado.', devResetUrl: resetUrl, devToken: token });
    }

    // Send email via nodemailer/resend if configured
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      });
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: user.email,
        subject: 'Guardline — Redefinição de Senha',
        html: `<p>Olá ${user.name},</p><p>Clique no link abaixo para redefinir sua senha (válido por 1 hora):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
    } catch (_emailErr) {
      console.error('[auth] forgotPassword email error:', _emailErr.message);
    }

    return ok(res, { message: 'Se o e-mail existir, um link de redefinição foi enviado.' });
  } catch (e) {
    next(e);
  }
}

async function resetPassword(req, res, next) {
  try {
    pruneExpiredResetTokens();
    const { token, password } = req.body;
    if (!token || !password) return fail(res, 400, 'token e password são obrigatórios', 'VALIDATION_ERROR');
    if (password.length < 8) return fail(res, 400, 'Senha mínimo 8 caracteres', 'VALIDATION_ERROR');

    const data = resetTokenStore.get(token);
    if (!data || data.expiresAt < Date.now()) {
      return fail(res, 401, 'Token inválido ou expirado', 'TOKEN_INVALID');
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.user.update({ where: { id: data.userId }, data: { password: hash } });
    await prisma.refreshToken.deleteMany({ where: { userId: data.userId } });
    resetTokenStore.delete(token);

    return ok(res, { message: 'Senha redefinida com sucesso. Faça login novamente.' });
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

async function bootstrapAdmin(req, res) {
  const secret = process.env.BOOTSTRAP_SECRET || '';
  if (!secret || req.headers['x-bootstrap-secret'] !== secret) {
    return fail(res, 403, 'Forbidden', 'FORBIDDEN');
  }
  const TARGET_EMAIL = 'julio.dealmeida@guardline.io';
  const NEW_PASSWORD = req.body.password || 'Guardline@2026';
  const hash = await bcrypt.hash(NEW_PASSWORD, SALT_ROUNDS);
  const user = await prisma.user.upsert({
    where: { email: TARGET_EMAIL },
    update: { role: 'admin', password: hash, name: 'Julio de Almeida', company: 'Guardline' },
    create: { email: TARGET_EMAIL, password: hash, name: 'Julio de Almeida', company: 'Guardline', role: 'admin' },
    select: { id: true, email: true, role: true, name: true },
  });
  return ok(res, { user, password: NEW_PASSWORD, message: 'Super-admin criado/atualizado.' });
}

module.exports = { register, login, refresh, logout, me, forgotPassword, resetPassword, bootstrapAdmin };
