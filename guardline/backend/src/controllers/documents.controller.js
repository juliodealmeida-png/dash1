const crypto = require('crypto');
const { prisma } = require('../config/database');
const { ok, fail } = require('../utils/response');
const blockchain = require('../services/blockchain.service');
const docNotify = require('../services/docNotification.service');

// ─── HELPERS ────────────────────────────────────────────

function generateToken() {
  return crypto.randomUUID();
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function addAuditLog(documentId, action, opts = {}) {
  return prisma.documentAuditLog.create({
    data: {
      documentId,
      action,
      actorName: opts.actorName || null,
      actorEmail: opts.actorEmail || null,
      ip: opts.ip || null,
      userAgent: opts.userAgent || null,
      geoLat: opts.geoLat || null,
      geoLon: opts.geoLon || null,
      metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
      documentHash: opts.documentHash || null,
    },
  });
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
}

// ─── LIST DOCUMENTS ────────────────────────────────────

async function list(req, res) {
  try {
    const { status, page = 1, perPage = 50 } = req.query;
    const where = { ownerId: req.user.id };
    if (status) where.status = status;

    const [docs, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          signers: { select: { id: true, name: true, email: true, role: true, status: true, color: true, signedAt: true } },
          _count: { select: { fields: true, auditLog: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (Number(page) - 1) * Number(perPage),
        take: Number(perPage),
      }),
      prisma.document.count({ where }),
    ]);

    return ok(res, docs, { total, page: Number(page), perPage: Number(perPage) });
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

// ─── GET SINGLE DOCUMENT ──────────────────────────────

async function getById(req, res) {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
      include: {
        signers: { include: { token: { select: { token: true, expiresAt: true } }, fields: true } },
        fields: true,
        auditLog: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!doc) return fail(res, 404, 'Documento não encontrado');
    return ok(res, doc);
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

// ─── CREATE DOCUMENT ──────────────────────────────────

async function create(req, res) {
  try {
    const { name, description, fileUrl, signerOrder, expiresAt, reminderDays, message, signers } = req.body;

    if (!name || !fileUrl) return fail(res, 400, 'name e fileUrl são obrigatórios');

    // Use real SHA-256 from upload endpoint if provided; fall back to pseudo-hash
    const fileHash = req.body.fileHash && /^[0-9a-f]{64}$/i.test(req.body.fileHash)
      ? req.body.fileHash
      : sha256(fileUrl + Date.now());

    const doc = await prisma.document.create({
      data: {
        name,
        description: description || null,
        fileUrl,
        fileHash,
        signerOrder: signerOrder || 'parallel',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        reminderDays: reminderDays || 2,
        message: message || null,
        ownerId: req.user.id,
      },
    });

    // Create signers if provided
    if (signers && Array.isArray(signers)) {
      const signerColors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
      for (let i = 0; i < signers.length; i++) {
        const s = signers[i];
        const signer = await prisma.documentSigner.create({
          data: {
            documentId: doc.id,
            name: s.name,
            email: s.email,
            cpf: s.cpf || null,
            role: s.role || 'signer',
            order: s.order ?? i,
            color: signerColors[i % signerColors.length],
          },
        });

        // Create signature token for each signer
        await prisma.signatureToken.create({
          data: {
            token: generateToken(),
            signerId: signer.id,
            expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
          },
        });
      }
    }

    await addAuditLog(doc.id, 'created', {
      actorName: req.user.name,
      actorEmail: req.user.email,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'],
      documentHash: fileHash,
    });

    const fullDoc = await prisma.document.findUnique({
      where: { id: doc.id },
      include: {
        signers: { include: { token: { select: { token: true } } } },
        fields: true,
      },
    });

    return ok(res, fullDoc, null, 201);
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

// ─── UPDATE DOCUMENT ──────────────────────────────────

async function update(req, res) {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!doc) return fail(res, 404, 'Documento não encontrado');
    if (doc.status !== 'draft') return fail(res, 400, 'Só é possível editar documentos em rascunho');

    const { name, description, signerOrder, expiresAt, reminderDays, message } = req.body;
    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(signerOrder && { signerOrder }),
        ...(expiresAt && { expiresAt: new Date(expiresAt) }),
        ...(reminderDays !== undefined && { reminderDays }),
        ...(message !== undefined && { message }),
      },
    });

    return ok(res, updated);
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

// ─── DELETE DOCUMENT ──────────────────────────────────

async function remove(req, res) {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!doc) return fail(res, 404, 'Documento não encontrado');

    await prisma.document.delete({ where: { id: doc.id } });
    return ok(res, { deleted: true });
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

// ─── SEND DOCUMENT (draft → sent) ────────────────────

async function send(req, res) {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
      include: { signers: true, fields: true },
    });
    if (!doc) return fail(res, 404, 'Documento não encontrado');
    if (doc.status !== 'draft') return fail(res, 400, 'Documento já foi enviado');
    if (!doc.signers.length) return fail(res, 400, 'Adicione ao menos um signatário');
    if (!doc.fields.length) return fail(res, 400, 'Adicione ao menos um campo de assinatura');

    await prisma.document.update({
      where: { id: doc.id },
      data: { status: 'sent' },
    });

    // Update signers to notified
    await prisma.documentSigner.updateMany({
      where: { documentId: doc.id, status: 'pending' },
      data: { status: 'notified' },
    });

    await addAuditLog(doc.id, 'sent', {
      actorName: req.user.name,
      actorEmail: req.user.email,
      ip: getClientIp(req),
      documentHash: doc.fileHash,
      metadata: { signerCount: doc.signers.length, fieldCount: doc.fields.length },
    });

    // Send emails to signers (non-blocking)
    const signersFull = await prisma.documentSigner.findMany({
      where: { documentId: doc.id },
      include: { token: { select: { token: true } } },
    });
    for (const s of signersFull) {
      if (s.token?.token && s.role !== 'observer') {
        docNotify.sendSignatureRequest(s, doc, s.token.token, req.user.name).catch(e => console.error('Email error:', e.message));
        docNotify.createInAppNotification(req.user.id, 'signature_requested', 'Documento enviado', `Link enviado para ${s.name} (${s.email})`, doc.id).catch(() => {});
      }
    }

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) io.emit('document:sent', { documentId: doc.id, name: doc.name });

    return ok(res, { status: 'sent', signers: doc.signers.length });
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

// ─── CANCEL DOCUMENT ──────────────────────────────────

async function cancel(req, res) {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!doc) return fail(res, 404, 'Documento não encontrado');
    if (['completed', 'cancelled'].includes(doc.status)) return fail(res, 400, 'Não é possível cancelar este documento');

    await prisma.document.update({
      where: { id: doc.id },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });

    await addAuditLog(doc.id, 'cancelled', {
      actorName: req.user.name,
      actorEmail: req.user.email,
      ip: getClientIp(req),
    });

    return ok(res, { status: 'cancelled' });
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

// ─── MANAGE SIGNERS ───────────────────────────────────

async function addSigner(req, res) {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!doc) return fail(res, 404, 'Documento não encontrado');
    if (doc.status !== 'draft') return fail(res, 400, 'Só é possível adicionar signatários em rascunho');

    const { name, email, cpf, role, order } = req.body;
    if (!name || !email) return fail(res, 400, 'name e email são obrigatórios');

    const signerCount = await prisma.documentSigner.count({ where: { documentId: doc.id } });
    const colors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

    const signer = await prisma.documentSigner.create({
      data: {
        documentId: doc.id,
        name,
        email,
        cpf: cpf || null,
        role: role || 'signer',
        order: order ?? signerCount,
        color: colors[signerCount % colors.length],
      },
    });

    await prisma.signatureToken.create({
      data: {
        token: generateToken(),
        signerId: signer.id,
        expiresAt: doc.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return ok(res, signer, null, 201);
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

async function removeSigner(req, res) {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!doc) return fail(res, 404, 'Documento não encontrado');
    if (doc.status !== 'draft') return fail(res, 400, 'Só é possível remover signatários em rascunho');

    await prisma.documentSigner.delete({ where: { id: req.params.signerId } });
    return ok(res, { deleted: true });
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

// ─── MANAGE FIELDS ────────────────────────────────────

async function saveFields(req, res) {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!doc) return fail(res, 404, 'Documento não encontrado');
    if (doc.status !== 'draft') return fail(res, 400, 'Só é possível editar campos em rascunho');

    const { fields } = req.body;
    if (!Array.isArray(fields)) return fail(res, 400, 'fields deve ser um array');

    // Delete existing fields and recreate
    await prisma.documentField.deleteMany({ where: { documentId: doc.id } });

    const created = [];
    for (const f of fields) {
      const field = await prisma.documentField.create({
        data: {
          documentId: doc.id,
          signerId: f.signerId || null,
          type: f.type,
          page: f.page,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          required: f.required !== false,
        },
      });
      created.push(field);
    }

    return ok(res, created);
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

// ─── PUBLIC: SIGNER PORTAL ────────────────────────────
// These endpoints don't require JWT auth

async function getByToken(req, res) {
  try {
    const { token } = req.params;
    const tokenRecord = await prisma.signatureToken.findUnique({
      where: { token },
      include: {
        signer: {
          include: {
            document: {
              include: {
                fields: true,
                signers: { select: { id: true, name: true, role: true, status: true, color: true, order: true } },
              },
            },
          },
        },
      },
    });

    if (!tokenRecord) return fail(res, 404, 'Link inválido ou expirado');
    if (tokenRecord.expiresAt < new Date()) return fail(res, 410, 'Link expirado');

    const signer = tokenRecord.signer;
    const doc = signer.document;

    // Mark as viewed
    if (!signer.viewedAt) {
      await prisma.documentSigner.update({
        where: { id: signer.id },
        data: { viewedAt: new Date(), status: signer.status === 'notified' ? 'viewed' : signer.status },
      });
      await addAuditLog(doc.id, 'viewed', {
        actorName: signer.name,
        actorEmail: signer.email,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });
    }

    // Only return fields assigned to this signer
    const myFields = doc.fields.filter(f => f.signerId === signer.id);

    return ok(res, {
      document: {
        id: doc.id,
        name: doc.name,
        description: doc.description,
        fileUrl: doc.fileUrl,
        status: doc.status,
        message: doc.message,
      },
      signer: {
        id: signer.id,
        name: signer.name,
        email: signer.email,
        role: signer.role,
        status: signer.status,
        color: signer.color,
      },
      fields: myFields,
      allSigners: doc.signers,
      otpRequired: !tokenRecord.otpVerified,
    });
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

async function requestOtp(req, res) {
  try {
    const { token } = req.params;
    const tokenRecord = await prisma.signatureToken.findUnique({
      where: { token },
      include: { signer: true },
    });
    if (!tokenRecord) return fail(res, 404, 'Token inválido');
    if (tokenRecord.expiresAt < new Date()) return fail(res, 410, 'Token expirado');

    const otp = generateOtp();
    const otpHash = sha256(otp);

    await prisma.signatureToken.update({
      where: { id: tokenRecord.id },
      data: {
        otpCode: otpHash,
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        otpVerified: false,
      },
    });

    // TODO: Send OTP via email (Deliverable 7)
    // For now, return it in dev mode
    const isDev = process.env.NODE_ENV !== 'production';

    return ok(res, {
      message: 'Código OTP enviado para ' + tokenRecord.signer.email,
      ...(isDev && { devOtp: otp }),
    });
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

async function verifyOtp(req, res) {
  try {
    const { token } = req.params;
    const { code } = req.body;
    if (!code) return fail(res, 400, 'Código OTP obrigatório');

    const tokenRecord = await prisma.signatureToken.findUnique({ where: { token } });
    if (!tokenRecord) return fail(res, 404, 'Token inválido');
    if (tokenRecord.otpExpiresAt && tokenRecord.otpExpiresAt < new Date()) return fail(res, 410, 'Código expirado');

    const codeHash = sha256(code);
    if (codeHash !== tokenRecord.otpCode) return fail(res, 401, 'Código incorreto');

    await prisma.signatureToken.update({
      where: { id: tokenRecord.id },
      data: { otpVerified: true },
    });

    return ok(res, { verified: true });
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

async function sign(req, res) {
  try {
    const { token } = req.params;
    const { signatureData, signatureMethod, fieldValues, geoLat, geoLon, geoAddress, geoSource, geoAccuracy, deviceType, browser: browserName, operatingSystem, timezone, language, fingerprint, fingerprintComponents } = req.body;

    const tokenRecord = await prisma.signatureToken.findUnique({
      where: { token },
      include: { signer: { include: { document: { include: { signers: true } } } } },
    });

    if (!tokenRecord) return fail(res, 404, 'Token inválido');
    if (tokenRecord.expiresAt < new Date()) return fail(res, 410, 'Token expirado');
    if (!tokenRecord.otpVerified) return fail(res, 403, 'Verificação OTP necessária');

    const signer = tokenRecord.signer;
    const doc = signer.document;

    if (signer.status === 'signed') return fail(res, 400, 'Já assinado');
    if (!signatureData) return fail(res, 400, 'Dados da assinatura obrigatórios');

    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    // Update signer
    await prisma.documentSigner.update({
      where: { id: signer.id },
      data: {
        status: 'signed',
        signedAt: new Date(),
        signatureData,
        signatureMethod: signatureMethod || 'draw',
        signerIp: ip,
        signerAgent: userAgent,
        signerGeoLat: geoLat || null,
        signerGeoLon: geoLon || null,
        geoAddress: geoAddress || null,
        geoSource: geoSource || null,
        geoAccuracy: geoAccuracy || null,
        deviceType: deviceType || null,
        browser: browserName || null,
        operatingSystem: operatingSystem || null,
        timezone: timezone || null,
        language: language || null,
        fingerprint: fingerprint || null,
        fingerprintJson: fingerprintComponents ? JSON.stringify(fingerprintComponents) : null,
      },
    });

    // Fill field values
    if (fieldValues && typeof fieldValues === 'object') {
      for (const [fieldId, value] of Object.entries(fieldValues)) {
        await prisma.documentField.update({
          where: { id: fieldId },
          data: { value: String(value), filledAt: new Date() },
        }).catch(() => {}); // ignore if field not found
      }
    }

    // Mark token as used
    await prisma.signatureToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    // Audit log
    await addAuditLog(doc.id, 'signed', {
      actorName: signer.name,
      actorEmail: signer.email,
      ip,
      userAgent,
      geoLat: geoLat || null,
      geoLon: geoLon || null,
      documentHash: doc.fileHash,
      metadata: { signatureMethod, role: signer.role },
    });

    // Check if all signers have signed
    const allSigners = await prisma.documentSigner.findMany({
      where: { documentId: doc.id },
    });
    const allSigned = allSigners.every(s => s.status === 'signed' || s.role === 'observer');

    if (allSigned) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: 'completed', completedAt: new Date() },
      });
      await addAuditLog(doc.id, 'completed', {
        actorName: 'Sistema',
        metadata: { signerCount: allSigners.length },
      });

      // Register on blockchain (non-blocking — document is valid even if this fails)
      blockchain.registerOnBlockchain(doc.fileHash).then(async (bcResult) => {
        if (bcResult) {
          await prisma.document.update({
            where: { id: doc.id },
            data: {
              blockchainTxHash: bcResult.txHash,
              blockchainBlock: bcResult.blockNumber,
              blockchainUrl: bcResult.polygonscanUrl,
              blockchainTimestamp: new Date(bcResult.timestamp),
            },
          });
          await addAuditLog(doc.id, 'blockchain_registered', {
            actorName: 'Sistema',
            metadata: bcResult,
          });
          console.log('Document', doc.id, 'registered on blockchain:', bcResult.polygonscanUrl);
        }
      }).catch(e => console.error('Blockchain registration error:', e.message));

      // Emit completion event
      const io = req.app.get('io');
      if (io) io.emit('document:completed', { documentId: doc.id, name: doc.name });
    } else {
      // Update doc status to in_progress
      if (doc.status === 'sent') {
        await prisma.document.update({
          where: { id: doc.id },
          data: { status: 'in_progress' },
        });
      }
    }

    // Emit sign event
    const io = req.app.get('io');
    if (io) io.emit('document:signed', { documentId: doc.id, signerName: signer.name, allSigned });

    // Notify document owner (non-blocking)
    const owner = await prisma.user.findUnique({ where: { id: doc.ownerId }, select: { email: true, id: true } });
    if (owner) {
      docNotify.sendSignedNotification(doc, signer.name, owner.email).catch(e => console.error('Email error:', e));
      docNotify.createInAppNotification(owner.id, 'signed', `${signer.name} assinou`, `${signer.name} assinou o documento ${doc.name}`, doc.id).catch(() => {});
      if (allSigned) {
        docNotify.sendCompletedNotification(doc, owner.email).catch(e => console.error('Email error:', e));
        docNotify.createInAppNotification(owner.id, 'completed', 'Documento concluído!', `Todos assinaram ${doc.name}`, doc.id).catch(() => {});
      }
    }

    return ok(res, { signed: true, allSigned });
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

async function refuse(req, res) {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    const tokenRecord = await prisma.signatureToken.findUnique({
      where: { token },
      include: { signer: { include: { document: true } } },
    });
    if (!tokenRecord) return fail(res, 404, 'Token inválido');

    const signer = tokenRecord.signer;

    await prisma.documentSigner.update({
      where: { id: signer.id },
      data: { status: 'refused', refusedAt: new Date(), refuseReason: reason || null },
    });

    await prisma.document.update({
      where: { id: signer.document.id },
      data: { status: 'refused' },
    });

    await addAuditLog(signer.document.id, 'refused', {
      actorName: signer.name,
      actorEmail: signer.email,
      ip: getClientIp(req),
      metadata: { reason },
    });

    const io = req.app.get('io');
    if (io) io.emit('document:refused', { documentId: signer.document.id, signerName: signer.name, reason });

    // Notify owner
    const refOwner = await prisma.user.findUnique({ where: { id: signer.document.ownerId }, select: { email: true, id: true } });
    if (refOwner) {
      docNotify.sendRefusedNotification(signer.document, signer.name, reason, refOwner.email).catch(e => console.error('Email error:', e));
      docNotify.createInAppNotification(refOwner.id, 'refused', `${signer.name} recusou`, `${signer.name} recusou assinar ${signer.document.name}. Motivo: ${reason || 'Não informado'}`, signer.document.id).catch(() => {});
    }

    return ok(res, { refused: true });
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

// ─── AUDIT LOG ────────────────────────────────────────

async function getAuditLog(req, res) {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!doc) return fail(res, 404, 'Documento não encontrado');

    const logs = await prisma.documentAuditLog.findMany({
      where: { documentId: doc.id },
      orderBy: { createdAt: 'desc' },
    });

    return ok(res, logs);
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

// ─── REMINDERS ────────────────────────────────────────

async function sendReminder(req, res) {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
      include: { signers: true },
    });
    if (!doc) return fail(res, 404, 'Documento não encontrado');

    const { signerId, message } = req.body;
    const signer = doc.signers.find(s => s.id === signerId);
    if (!signer) return fail(res, 404, 'Signatário não encontrado');
    if (signer.status === 'signed') return fail(res, 400, 'Signatário já assinou');

    // Anti-spam: max 3 per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await prisma.reminderLog.count({
      where: { signerId, sentAt: { gte: today } },
    });
    if (count >= 3) return fail(res, 429, 'Limite de 3 lembretes por dia atingido');

    await prisma.reminderLog.create({
      data: {
        signerId,
        type: 'manual',
        sentBy: req.user.id,
        message: message || null,
      },
    });

    await addAuditLog(doc.id, 'reminder_sent', {
      actorName: req.user.name,
      actorEmail: req.user.email,
      metadata: { signerId, signerName: signer.name, type: 'manual' },
    });

    // TODO: Send reminder email (Deliverable 7)

    return ok(res, { sent: true, signerName: signer.name });
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

// ─── NOTIFICATIONS ────────────────────────────────────

async function listNotifications(req, res) {
  try {
    const notifs = await prisma.docNotification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return ok(res, notifs);
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

async function markNotificationRead(req, res) {
  try {
    await prisma.docNotification.update({
      where: { id: req.params.notifId },
      data: { read: true, readAt: new Date() },
    });
    return ok(res, { read: true });
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

// ─── STATS ────────────────────────────────────────────

async function stats(req, res) {
  try {
    const where = { ownerId: req.user.id };
    const [total, draft, sent, inProgress, completed, expired, refused] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.count({ where: { ...where, status: 'draft' } }),
      prisma.document.count({ where: { ...where, status: 'sent' } }),
      prisma.document.count({ where: { ...where, status: 'in_progress' } }),
      prisma.document.count({ where: { ...where, status: 'completed' } }),
      prisma.document.count({ where: { ...where, status: 'expired' } }),
      prisma.document.count({ where: { ...where, status: 'refused' } }),
    ]);

    return ok(res, { total, draft, sent, inProgress, completed, expired, refused });
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

// ─── PUBLIC VERIFICATION ──────────────────────────────

async function verifyHash(req, res) {
  try {
    const { hash } = req.body;
    if (!hash || hash.length !== 64) return fail(res, 400, 'Hash SHA-256 inválido (64 caracteres hex)');

    // Search in local DB
    const doc = await prisma.document.findFirst({
      where: { OR: [{ fileHash: hash }, { finalFileHash: hash }] },
      select: {
        id: true, name: true, status: true, completedAt: true,
        blockchainTxHash: true, blockchainBlock: true, blockchainUrl: true, blockchainTimestamp: true,
        signers: { select: { name: true, email: true, status: true, signedAt: true } },
      },
    });

    if (!doc) {
      return ok(res, { verified: false, message: 'Hash não encontrado — documento pode ter sido alterado ou não está registrado.' });
    }

    // If blockchain tx exists, verify on-chain
    let blockchainVerification = null;
    if (doc.blockchainTxHash) {
      blockchainVerification = await blockchain.verifyOnBlockchain(doc.blockchainTxHash, hash);
    }

    return ok(res, {
      verified: true,
      document: {
        name: doc.name,
        status: doc.status,
        completedAt: doc.completedAt,
        signers: doc.signers.map(s => ({ name: s.name, status: s.status, signedAt: s.signedAt })),
      },
      blockchain: doc.blockchainTxHash ? {
        registered: true,
        txHash: doc.blockchainTxHash,
        blockNumber: doc.blockchainBlock,
        url: doc.blockchainUrl,
        timestamp: doc.blockchainTimestamp,
        onChainVerified: blockchainVerification ? blockchainVerification.verified : null,
      } : { registered: false },
      message: 'Documento autêntico — registrado em ' + (doc.completedAt ? new Date(doc.completedAt).toLocaleString('pt-BR') : 'data desconhecida'),
    });
  } catch (e) {
    return fail(res, 500, e.message);
  }
}

// ─── IP GEOLOCATION (Feature 14 — fallback) ──────────

async function geolocateIp(req, res) {
  try {
    const ip = req.body.ip || getClientIp(req);
    const resp = await fetch('http://ip-api.com/json/' + ip + '?fields=status,country,regionName,city,lat,lon,isp,query');
    const data = await resp.json();
    if (data.status !== 'success') return ok(res, { source: 'ip_fallback', error: 'Lookup failed' });
    return ok(res, {
      source: 'ip_fallback',
      ip: data.query,
      country: data.country,
      region: data.regionName,
      city: data.city,
      lat: data.lat,
      lon: data.lon,
      isp: data.isp,
    });
  } catch(e) { return ok(res, { source: 'ip_fallback', error: e.message }); }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  send,
  cancel,
  addSigner,
  removeSigner,
  saveFields,
  getByToken,
  requestOtp,
  verifyOtp,
  sign,
  refuse,
  getAuditLog,
  sendReminder,
  listNotifications,
  markNotificationRead,
  stats,
  verifyHash,
  geolocateIp,
};
