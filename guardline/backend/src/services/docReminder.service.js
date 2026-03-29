/**
 * Document Reminder Service — Automatic reminders for pending signers
 * Runs as a scheduled check (call from scheduler or cron).
 */

const { prisma } = require('../config/database');
const notify = require('./docNotification.service');

/**
 * Check all active documents and send reminders as needed.
 * Call this every hour or so via the existing scheduler.
 */
async function checkAndSendReminders() {
  const now = new Date();

  // Find documents that are sent/in_progress and not expired
  const docs = await prisma.document.findMany({
    where: {
      status: { in: ['sent', 'in_progress'] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: {
      signers: {
        where: { status: { in: ['pending', 'notified', 'viewed'] } },
        include: { token: { select: { token: true } } },
      },
      owner: { select: { name: true, email: true } },
    },
  });

  let sentCount = 0;

  for (const doc of docs) {
    if (!doc.expiresAt) continue;

    const daysUntilExpiry = Math.ceil((doc.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const reminderDays = doc.reminderDays || 2;

    for (const signer of doc.signers) {
      let reminderType = null;

      if (daysUntilExpiry <= 0) {
        // Expired — mark document
        await prisma.document.update({ where: { id: doc.id }, data: { status: 'expired' } });
        await prisma.documentSigner.update({ where: { id: signer.id }, data: { status: 'expired' } });
        continue;
      } else if (daysUntilExpiry === 1) {
        reminderType = 'auto_24h';
      } else if (daysUntilExpiry <= reminderDays) {
        reminderType = 'auto_2d';
      } else if (daysUntilExpiry === 0) {
        reminderType = 'auto_day';
      }

      if (!reminderType) continue;

      // Check if already sent today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const alreadySent = await prisma.reminderLog.count({
        where: { signerId: signer.id, type: reminderType, sentAt: { gte: today } },
      });

      if (alreadySent > 0) continue;

      // Send reminder
      const signerToken = signer.token?.token;
      if (!signerToken) continue;

      try {
        await notify.sendReminder(signer, doc, signerToken);
        await prisma.reminderLog.create({
          data: { signerId: signer.id, type: reminderType },
        });
        sentCount++;
      } catch (e) {
        console.error('Reminder failed for', signer.email, ':', e.message);
      }
    }
  }

  if (sentCount > 0) {
    console.log(`[Reminders] Sent ${sentCount} automatic reminder(s)`);
  }

  return { sent: sentCount };
}

module.exports = { checkAndSendReminders };
