const { google } = require('googleapis');
const crypto = require('crypto');
const { prisma } = require('../config/database');

function encryptionKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(String(raw), 'utf8');
  if (key.length !== 32) return null;
  return key;
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

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI || 'http://localhost:3001/api/integrations/gmail/callback'
  );
}

function getAuthUrl(state) {
  const o = getOAuth2Client();
  return o.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state,
  });
}

async function exchangeCodeForTokens(code) {
  const o = getOAuth2Client();
  const { tokens } = await o.getToken(code);
  o.setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: o });
  const prof = await gmail.users.getProfile({ userId: 'me' });
  return { tokens, email: prof.data.emailAddress || '' };
}

function getGmailClient(tokens) {
  const auth = getOAuth2Client();
  auth.setCredentials(tokens);
  return google.gmail({ version: 'v1', auth });
}

async function findGmailIntegrationForUser(userId) {
  let row = await prisma.integration.findFirst({
    where: { type: 'gmail', status: 'connected', userId },
  });
  if (!row) {
    row = await prisma.integration.findFirst({
      where: { type: 'gmail', status: 'connected', userId: null },
    });
  }
  return row;
}

function parseConfig(integration) {
  if (!integration || !integration.config) return null;
  try {
    return JSON.parse(decryptConfigString(integration.config));
  } catch {
    return null;
  }
}

async function syncEmailsToDeals(userId) {
  const integration = await findGmailIntegrationForUser(userId);
  if (!integration) return { synced: 0, skipped: 'no_integration' };

  const cfg = parseConfig(integration);
  if (!cfg || !cfg.tokens) return { synced: 0, skipped: 'no_tokens' };

  const gmail = getGmailClient(cfg.tokens);

  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    q: 'newer_than:7d',
    maxResults: 50,
  });

  const messages = listResponse.data.messages || [];
  let synced = 0;

  const deals = await prisma.deal.findMany({
    where: {
      ownerId: userId,
      deletedAt: null,
      contactEmail: { not: null },
    },
  });

  const dealsByEmail = {};
  const dealsByDomain = {};
  deals.forEach((deal) => {
    if (deal.contactEmail) {
      const em = deal.contactEmail.toLowerCase();
      dealsByEmail[em] = deal;
      const domain = em.split('@')[1];
      if (domain) dealsByDomain[domain] = deal;
    }
  });

  const accountEmail = (cfg.email || '').toLowerCase();

  for (const msg of messages) {
    try {
      const existing = await prisma.dealEmail.findUnique({
        where: { gmailId: msg.id },
      });
      if (existing) continue;

      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const headers = detail.data.payload?.headers || [];
      const getHeader = (name) =>
        headers.find((h) => h.name && h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const from = getHeader('From');
      const to = getHeader('To');
      const subject = getHeader('Subject');
      const date = detail.data.internalDate
        ? new Date(parseInt(detail.data.internalDate, 10))
        : new Date();

      const emailMatch = (from + ' ' + to).match(/[\w.+-]+@[\w-]+\.[a-z]+/gi) || [];

      let matchedDeal = null;
      for (const email of emailMatch) {
        const lower = email.toLowerCase();
        if (dealsByEmail[lower]) {
          matchedDeal = dealsByEmail[lower];
          break;
        }
        const domain = lower.split('@')[1];
        if (domain && dealsByDomain[domain]) {
          matchedDeal = dealsByDomain[domain];
          break;
        }
      }

      if (matchedDeal) {
        const fromLower = from.toLowerCase();
        const isOutbound = accountEmail && fromLower.includes(accountEmail);

        await prisma.dealEmail.create({
          data: {
            dealId: matchedDeal.id,
            gmailId: msg.id,
            from: from || '—',
            to: to || '—',
            subject: subject || '(sem assunto)',
            snippet: detail.data.snippet || '',
            receivedAt: date,
            direction: isOutbound ? 'outbound' : 'inbound',
          },
        });

        await prisma.deal.update({
          where: { id: matchedDeal.id },
          data: { lastContactAt: date },
        });

        synced++;
      }
    } catch (error) {
      console.error(`[gmail] email ${msg.id}:`, error.message);
    }
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: { lastSyncAt: new Date(), errorMessage: null },
  });

  return { synced };
}

async function sendEmail({ to, subject, body, userId }) {
  const integration = await findGmailIntegrationForUser(userId);
  if (!integration) throw new Error('Gmail não conectado');

  const cfg = parseConfig(integration);
  if (!cfg || !cfg.tokens) throw new Error('Tokens Gmail inválidos');

  const gmail = getGmailClient(cfg.tokens);

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    body,
  ].join('\n');

  const encoded = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded },
  });
}

module.exports = {
  getOAuth2Client,
  getAuthUrl,
  exchangeCodeForTokens,
  getGmailClient,
  syncEmailsToDeals,
  sendEmail,
  findGmailIntegrationForUser,
};
