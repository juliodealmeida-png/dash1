const crypto = require('crypto');

function encryptionKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(String(raw), 'utf8');
  if (key.length !== 32) return null;
  return key;
}

function encryptString(raw) {
  const key = encryptionKey();
  if (!key) return raw;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(raw || ''), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

function decryptString(config) {
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

function encryptJson(obj) {
  return encryptString(JSON.stringify(obj || {}));
}

function decryptJson(config) {
  const raw = decryptString(config);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

module.exports = { encryptString, decryptString, encryptJson, decryptJson };

