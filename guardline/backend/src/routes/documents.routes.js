const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { validateRequest } = require('../middleware/validateRequest');
const docs = require('../controllers/documents.controller');

// ─── AUTHENTICATED ROUTES (dashboard) ─────────────────

router.get('/stats', authMiddleware, apiLimiter, docs.stats);

router.get('/', authMiddleware, apiLimiter, [
  query('status').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('perPage').optional().isInt({ min: 1, max: 100 }),
], validateRequest, docs.list);

router.get('/notifications', authMiddleware, apiLimiter, docs.listNotifications);

router.patch('/notifications/:notifId/read', authMiddleware, apiLimiter, [
  param('notifId').isString(),
], validateRequest, docs.markNotificationRead);

router.post('/', authMiddleware, apiLimiter, [
  body('name').isString().notEmpty(),
  body('fileUrl').isString().notEmpty(),
  body('signerOrder').optional().isIn(['parallel', 'sequential']),
  body('signers').optional().isArray(),
  body('signers.*.name').optional().isString().notEmpty(),
  body('signers.*.email').optional().isEmail(),
], validateRequest, docs.create);

router.get('/:id', authMiddleware, apiLimiter, [
  param('id').isString(),
], validateRequest, docs.getById);

router.put('/:id', authMiddleware, apiLimiter, [
  param('id').isString(),
], validateRequest, docs.update);

router.delete('/:id', authMiddleware, apiLimiter, [
  param('id').isString(),
], validateRequest, docs.remove);

router.post('/:id/send', authMiddleware, apiLimiter, [
  param('id').isString(),
], validateRequest, docs.send);

router.post('/:id/cancel', authMiddleware, apiLimiter, [
  param('id').isString(),
], validateRequest, docs.cancel);

router.post('/:id/signers', authMiddleware, apiLimiter, [
  param('id').isString(),
  body('name').isString().notEmpty(),
  body('email').isEmail(),
  body('role').optional().isIn(['signer', 'approver', 'witness', 'observer']),
], validateRequest, docs.addSigner);

router.delete('/:id/signers/:signerId', authMiddleware, apiLimiter, [
  param('id').isString(),
  param('signerId').isString(),
], validateRequest, docs.removeSigner);

router.put('/:id/fields', authMiddleware, apiLimiter, [
  param('id').isString(),
  body('fields').isArray(),
], validateRequest, docs.saveFields);

router.get('/:id/audit', authMiddleware, apiLimiter, [
  param('id').isString(),
], validateRequest, docs.getAuditLog);

router.post('/:id/reminders', authMiddleware, apiLimiter, [
  param('id').isString(),
  body('signerId').isString().notEmpty(),
], validateRequest, docs.sendReminder);

// ─── PUBLIC ROUTES (signer portal — NO auth required) ─

router.get('/sign/:token', [
  param('token').isString().isLength({ min: 36 }),
], validateRequest, docs.getByToken);

router.post('/sign/:token/otp', [
  param('token').isString(),
], validateRequest, docs.requestOtp);

router.post('/sign/:token/otp/verify', [
  param('token').isString(),
  body('code').isString().isLength({ min: 6, max: 6 }),
], validateRequest, docs.verifyOtp);

router.post('/sign/:token/sign', [
  param('token').isString(),
  body('signatureData').isString().notEmpty(),
], validateRequest, docs.sign);

router.post('/sign/:token/refuse', [
  param('token').isString(),
], validateRequest, docs.refuse);

// ─── PUBLIC: Verification ─────────────────────────────
router.post('/verify', [
  body('hash').isString().isLength({ min: 64, max: 64 }),
], validateRequest, docs.verifyHash);

// ─── PUBLIC: IP Geolocation fallback ──────────────────
router.post('/geolocate', docs.geolocateIp);

module.exports = router;
