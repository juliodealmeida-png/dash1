/**
 * Document Notification Service
 * Handles email + SMS + in-app notifications for the signature module.
 * Integrates with existing Gmail service and Twilio config.
 */

const { prisma } = require('../config/database');
const nodemailer = require('nodemailer');

// ─── EMAIL TRANSPORT ────────────────────────────────────

let _resend = null;
function getResend() {
  if (!_resend && process.env.RESEND_API_KEY) {
    const { Resend } = require('resend');
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

function getTransporter() {
  // Option 1: Resend (easiest — free 100 emails/day)
  if (process.env.RESEND_API_KEY) {
    return {
      sendMail: async (opts) => {
        const resend = getResend();
        const result = await resend.emails.send({
          from: opts.from || 'Guardline <onboarding@resend.dev>',
          to: Array.isArray(opts.to) ? opts.to : [opts.to],
          subject: opts.subject,
          html: opts.html,
          text: opts.text,
        });
        if (result.error) throw new Error(result.error.message);
        console.log('[EMAIL RESEND]', opts.to, '|', opts.subject, '| id:', result.data?.id);
        return { messageId: result.data?.id };
      },
    };
  }

  // Option 2: Gmail OAuth
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_REFRESH_TOKEN) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER || 'noreply@guardline.io',
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      },
    });
  }

  // Option 3: Gmail App Password (simple)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // Option 4: Generic SMTP
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback: log to console in dev
  console.warn('[EMAIL] No email provider configured. Set RESEND_API_KEY, GMAIL_APP_PASSWORD, or SMTP_HOST in .env');
  return {
    sendMail: async (opts) => {
      console.log('[EMAIL DEV — NOT SENT]', opts.to, '|', opts.subject);
      console.log('[EMAIL LINK]', opts.text?.match(/https?:\/\/\S+/)?.[0] || 'no link');
      return { messageId: 'dev-' + Date.now() };
    },
  };
}

// ─── EMAIL TEMPLATES ────────────────────────────────────

function baseTemplate(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#0b0e18;font-family:Inter,Arial,sans-serif">
<div style="max-width:560px;margin:24px auto;background:#131728;border:1px solid #1e2540;border-radius:14px;overflow:hidden">
<div style="padding:20px 24px;background:linear-gradient(135deg,#7c3aed,#5b21b6);text-align:center">
<div style="font-weight:800;font-size:18px;letter-spacing:3px;color:white">GUARDLINE</div></div>
<div style="padding:24px;color:#e2e8f0;font-size:14px;line-height:1.6">${content}</div>
<div style="padding:16px 24px;border-top:1px solid #1e2540;font-size:11px;color:#475569;text-align:center">
Este e-mail foi enviado automaticamente pela plataforma Guardline de assinatura digital.<br>
Se você não reconhece este documento, ignore esta mensagem.</div></div></body></html>`;
}

// ─── SEND FUNCTIONS ─────────────────────────────────────

async function sendSignatureRequest(signer, doc, signerToken, senderName) {
  const link = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3001';
  const signUrl = link + '/assinar/' + signerToken;

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#e2e8f0">${senderName} precisa da sua assinatura</h2>
    <p style="color:#94a3b8">Documento: <strong style="color:#e2e8f0">${doc.name}</strong></p>
    ${doc.message ? '<div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:8px;padding:12px;margin:16px 0;font-size:13px;color:#94a3b8"><strong>Mensagem:</strong> ' + doc.message + '</div>' : ''}
    ${doc.expiresAt ? '<p style="color:#f59e0b;font-size:12px">⏳ Prazo: ' + new Date(doc.expiresAt).toLocaleDateString('pt-BR') + '</p>' : ''}
    <div style="text-align:center;margin:24px 0">
    <a href="${signUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#5b21b6);color:white;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px">ASSINAR AGORA</a></div>
    <p style="font-size:12px;color:#475569">Seu papel: ${signer.role === 'approver' ? 'Aprovador' : signer.role === 'witness' ? 'Testemunha' : 'Assinante'}</p>
  `);

  await getTransporter().sendMail({
    from: '"Guardline" <noreply@guardline.io>',
    to: signer.email,
    subject: `${senderName} precisa da sua assinatura — ${doc.name}`,
    html,
    text: `${senderName} precisa da sua assinatura no documento "${doc.name}". Acesse: ${signUrl}`,
  });

  return { sent: true, to: signer.email };
}

async function sendSignedNotification(doc, signerName, recipientEmail) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#10b981">✅ ${signerName} assinou o documento</h2>
    <p style="color:#94a3b8">Documento: <strong style="color:#e2e8f0">${doc.name}</strong></p>
    <p style="font-size:13px;color:#94a3b8">Confira os detalhes no seu painel Guardline.</p>
  `);

  await getTransporter().sendMail({
    from: '"Guardline" <noreply@guardline.io>',
    to: recipientEmail,
    subject: `✅ ${signerName} assinou ${doc.name}`,
    html,
  });
}

async function sendCompletedNotification(doc, recipientEmail) {
  const link = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3001';
  const bcInfo = doc.blockchainUrl
    ? `<p style="font-size:12px;color:#9d5cf5">🔗 Registrado na blockchain: <a href="${doc.blockchainUrl}" style="color:#06b6d4">${doc.blockchainUrl}</a></p>`
    : '';

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#10b981">🎉 Documento totalmente assinado!</h2>
    <p style="color:#94a3b8">Documento: <strong style="color:#e2e8f0">${doc.name}</strong></p>
    <p style="font-size:13px;color:#94a3b8">Todos os participantes assinaram. O documento final está disponível no seu painel.</p>
    ${bcInfo}
    <div style="text-align:center;margin:20px 0">
    <a href="${link}" style="display:inline-block;padding:12px 24px;background:rgba(16,185,129,0.15);border:1px solid #10b981;color:#10b981;text-decoration:none;border-radius:10px;font-weight:700">Acessar Painel</a></div>
  `);

  await getTransporter().sendMail({
    from: '"Guardline" <noreply@guardline.io>',
    to: recipientEmail,
    subject: `🎉 Documento ${doc.name} assinado por todos`,
    html,
  });
}

async function sendRefusedNotification(doc, signerName, reason, recipientEmail) {
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#ef4444">❌ ${signerName} recusou assinar</h2>
    <p style="color:#94a3b8">Documento: <strong style="color:#e2e8f0">${doc.name}</strong></p>
    ${reason ? '<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:12px;margin:12px 0;font-size:13px;color:#f87171"><strong>Motivo:</strong> ' + reason + '</div>' : ''}
  `);

  await getTransporter().sendMail({
    from: '"Guardline" <noreply@guardline.io>',
    to: recipientEmail,
    subject: `❌ ${signerName} recusou assinar ${doc.name}`,
    html,
  });
}

async function sendReminder(signer, doc, signerToken, customMessage) {
  const link = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3001';
  const signUrl = link + '/assinar/' + signerToken;

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#f59e0b">🔔 Lembrete de assinatura</h2>
    <p style="color:#94a3b8">O documento <strong style="color:#e2e8f0">${doc.name}</strong> ainda aguarda sua assinatura.</p>
    ${customMessage ? '<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:12px;margin:12px 0;font-size:13px;color:#fbbf24">' + customMessage + '</div>' : ''}
    ${doc.expiresAt ? '<p style="color:#ef4444;font-size:12px;font-weight:700">⚠ Prazo: ' + new Date(doc.expiresAt).toLocaleDateString('pt-BR') + '</p>' : ''}
    <div style="text-align:center;margin:20px 0">
    <a href="${signUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#5b21b6);color:white;text-decoration:none;border-radius:10px;font-weight:700">ASSINAR AGORA</a></div>
  `);

  await getTransporter().sendMail({
    from: '"Guardline" <noreply@guardline.io>',
    to: signer.email,
    subject: `🔔 Lembrete: assinar ${doc.name}`,
    html,
  });
}

// ─── SMS via Twilio ─────────────────────────────────────

async function sendSms(to, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_WHATSAPP_FROM?.replace('whatsapp:', '');
  if (!sid || !token || !from) {
    console.log('[SMS DEV]', to, '|', message);
    return { sent: false, reason: 'Twilio not configured' };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(sid + ':' + token).toString('base64');

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: from, To: to, Body: message }).toString(),
    });
    const data = await resp.json();
    return { sent: true, sid: data.sid };
  } catch(e) {
    console.error('SMS error:', e.message);
    return { sent: false, error: e.message };
  }
}

// ─── IN-APP NOTIFICATION ────────────────────────────────

async function createInAppNotification(userId, type, title, message, documentId) {
  return prisma.docNotification.create({
    data: { userId, type, title, message, documentId: documentId || null },
  });
}

module.exports = {
  sendSignatureRequest,
  sendSignedNotification,
  sendCompletedNotification,
  sendRefusedNotification,
  sendReminder,
  sendSms,
  createInAppNotification,
};
