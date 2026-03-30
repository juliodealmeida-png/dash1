const { prisma } = require('../config/database');
const { ok, fail } = require('../utils/response');

async function getProfile(req, res, next) {
  try {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user.id },
    });
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, company: true, avatar: true, role: true },
    });
    return ok(res, { ...user, profile: profile || null });
  } catch (e) {
    next(e);
  }
}

async function upsertProfile(req, res, next) {
  try {
    const { emailOutreach, linkedinUrl, calendarUrl, phone, bio, timezone, n8nWebhookPath, metadata } = req.body;
    const profile = await prisma.sellerProfile.upsert({
      where: { userId: req.user.id },
      update: {
        ...(emailOutreach !== undefined && { emailOutreach: String(emailOutreach).trim() || null }),
        ...(linkedinUrl !== undefined && { linkedinUrl: String(linkedinUrl).trim() || null }),
        ...(calendarUrl !== undefined && { calendarUrl: String(calendarUrl).trim() || null }),
        ...(phone !== undefined && { phone: String(phone).trim() || null }),
        ...(bio !== undefined && { bio: String(bio).trim().slice(0, 500) || null }),
        ...(timezone !== undefined && { timezone: String(timezone).trim() || null }),
        ...(n8nWebhookPath !== undefined && { n8nWebhookPath: String(n8nWebhookPath).trim() || null }),
        ...(metadata !== undefined && { metadata: typeof metadata === 'string' ? metadata : JSON.stringify(metadata) }),
      },
      create: {
        userId: req.user.id,
        emailOutreach: emailOutreach ? String(emailOutreach).trim() : null,
        linkedinUrl: linkedinUrl ? String(linkedinUrl).trim() : null,
        calendarUrl: calendarUrl ? String(calendarUrl).trim() : null,
        phone: phone ? String(phone).trim() : null,
        bio: bio ? String(bio).trim().slice(0, 500) : null,
        timezone: timezone ? String(timezone).trim() : 'America/Sao_Paulo',
        n8nWebhookPath: n8nWebhookPath ? String(n8nWebhookPath).trim() : null,
        metadata: metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null,
      },
    });

    if (req.body.name || req.body.company || req.body.avatar) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...(req.body.name && { name: String(req.body.name).trim() }),
          ...(req.body.company !== undefined && { company: String(req.body.company).trim() || null }),
          ...(req.body.avatar !== undefined && { avatar: String(req.body.avatar).trim() || null }),
        },
      });
    }

    return ok(res, profile);
  } catch (e) {
    next(e);
  }
}

module.exports = { getProfile, upsertProfile };
