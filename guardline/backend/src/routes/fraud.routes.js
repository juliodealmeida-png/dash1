const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { validateRequest } = require('../middleware/validateRequest');
const fraud = require('../controllers/fraud.controller');

router.use(authMiddleware, apiLimiter);

router.get('/stats', fraud.stats);
router.get('/events', fraud.list);

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('perPage').optional().isInt({ min: 1, max: 500 }),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  validateRequest,
  fraud.list
);

router.post(
  '/',
  [
    body('lat').isFloat(),
    body('lng').isFloat(),
    body('type').trim().notEmpty(),
    body('amount').isFloat(),
    body('severity').isIn(['critical', 'high', 'medium', 'low']),
    body('riskScore').optional().isInt({ min: 0, max: 100 }),
  ],
  validateRequest,
  fraud.create
);

router.get('/:id', [param('id').notEmpty()], validateRequest, fraud.getOne);

router.patch(
  '/:id/status',
  [
    param('id').notEmpty(),
    body('status')
      .isIn(['detected', 'investigating', 'blocked', 'confirmed', 'false_positive'])
      .withMessage('status inválido'),
    body('notes').optional().trim(),
  ],
  validateRequest,
  fraud.updateStatus
);

router.delete('/:id', [param('id').notEmpty()], validateRequest, fraud.remove);

module.exports = router;
