const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { julioLimiter } = require('../middleware/rateLimiter');
const { validateRequest } = require('../middleware/validateRequest');
const julio = require('../controllers/julio.controller');

router.use(authMiddleware, julioLimiter);

router.get('/brief/latest', julio.getBriefLatest);

router.post('/brief', julio.postBrief);

router.get('/conversations', julio.listConversations);

router.get('/conversations/:id', [param('id').notEmpty()], validateRequest, julio.getConversation);

router.post(
  '/chat',
  [body('message').trim().notEmpty().withMessage('message obrigatório'), body('conversationId').optional().trim()],
  validateRequest,
  julio.chatStream
);

router.post(
  '/chat/sync',
  [body('message').trim().notEmpty(), body('conversationId').optional().trim()],
  validateRequest,
  julio.chatSync
);

router.post('/loss-analysis', requireRole('founder', 'admin'), julio.postLossAnalysis);

router.post('/investor-update', requireRole('founder', 'admin'), julio.postInvestorUpdate);

router.post(
  '/meddpicc/:dealId',
  [param('dealId').notEmpty()],
  validateRequest,
  julio.postMeddpiccAnalyze
);

router.get(
  '/meddpicc/:dealId/history',
  [param('dealId').notEmpty()],
  validateRequest,
  julio.getMeddpiccHistory
);

router.get('/meddpicc-dashboard', julio.getMeddpiccDashboard);

router.post(
  '/document/analyze',
  [body('docName').trim().notEmpty(), body('docContent').optional()],
  validateRequest,
  julio.postDocumentAnalyze
);

router.post(
  '/document/generate',
  [body('prompt').trim().notEmpty(), body('documentType').optional().trim()],
  validateRequest,
  julio.postDocumentGenerate
);

router.post(
  '/meeting-intel/:dealId',
  [param('dealId').notEmpty(), body('transcript').notEmpty()],
  validateRequest,
  julio.postMeetingTranscript
);

router.post(
  '/social-intel/icebreaker',
  [body('leadId').optional().trim(), body('dealId').optional().trim()],
  validateRequest,
  julio.postIcebreaker
);

module.exports = router;
