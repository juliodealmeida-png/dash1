const { prisma } = require('../config/database');
const { ok, fail } = require('../utils/response');
const crypto = require('crypto');

function encryptionKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(String(raw), 'utf8');
  if (key.length !== 32) return null;
  return key;
}

function encryptConfigObject(obj) {
  const raw = JSON.stringify(obj || {});
  const key = encryptionKey();
  if (!key) return raw;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(raw, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

function decryptConfigString(config) {
  if (!config || typeof config !== 'string') return config;
  if (!config.startsWith('enc:v1:')) return config;
  const key = encryptionKey();
  if (!key) return config;
  const payload = config.slice('enc:v1:'.length);
  const parts = payload.split('.');
  if (parts.length !== 3) return config;
  try {
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const enc = Buffer.from(parts[2], 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return config;
  }
}

function parseIntegrationConfig(config) {
  if (!config) return null;
  const raw = decryptConfigString(config);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Frontend endpoint to save credentials
async function saveCredentials(req, res, next) {
  try {
    const { type } = req.params;
    const allowedTypes = ['waalaxy', 'calendar', 'whatsapp', 'linkedin'];
    if (!allowedTypes.includes(type)) {
      return fail(res, 400, 'Tipo de conector inválido', 'INVALID_TYPE');
    }

    const credentials = req.body;
    if (!credentials || Object.keys(credentials).length === 0) {
      return fail(res, 400, 'Credenciais não fornecidas', 'MISSING_CREDENTIALS');
    }

    const config = encryptConfigObject(credentials);

    const existing = await prisma.integration.findFirst({
      where: { type, userId: req.user.id }
    });

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: {
          status: 'connected',
          config,
          errorMessage: null,
          updatedAt: new Date()
        }
      });
    } else {
      await prisma.integration.create({
        data: {
          type,
          status: 'connected',
          config,
          userId: req.user.id,
          metadata: JSON.stringify({ savedAt: new Date().toISOString() })
        }
      });
    }

    return ok(res, { connected: true, type });
  } catch (e) {
    next(e);
  }
}

// Protected endpoint for n8n to fetch decrypted credentials
async function getCredentialsForN8n(req, res, next) {
  try {
    // Basic protection: requires N8N_API_KEY in headers or query
    const providedKey = req.headers['x-n8n-api-key'] || req.query.apiKey;
    const expectedKey = process.env.N8N_API_KEY;
    
    if (!expectedKey || providedKey !== expectedKey) {
      return fail(res, 401, 'Unauthorized for n8n', 'UNAUTHORIZED');
    }

    const { userId, type } = req.query;
    if (!userId || !type) {
      return fail(res, 400, 'Missing userId or type', 'MISSING_PARAMS');
    }

    const integration = await prisma.integration.findFirst({
      where: { type, userId },
      orderBy: { updatedAt: 'desc' }
    });

    if (!integration || integration.status !== 'connected') {
      return fail(res, 404, 'Credenciais não encontradas ou desconectadas', 'NOT_FOUND');
    }

    const credentials = parseIntegrationConfig(integration.config);
    return ok(res, { type, userId, credentials });
  } catch (e) {
    next(e);
  }
}

// Disconnect/Delete credentials
async function disconnect(req, res, next) {
  try {
    const { type } = req.params;
    await prisma.integration.deleteMany({
      where: { type, userId: req.user.id }
    });
    return ok(res, { disconnected: true, type });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  saveCredentials,
  getCredentialsForN8n,
  disconnect
};
