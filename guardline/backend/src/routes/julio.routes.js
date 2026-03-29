const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
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

router.post('/loss-analysis', julio.postLossAnalysis);

router.post('/investor-update', julio.postInvestorUpdate);

module.exports = router;
