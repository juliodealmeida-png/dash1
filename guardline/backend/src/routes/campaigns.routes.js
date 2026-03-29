const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { validateRequest } = require('../middleware/validateRequest');
const campaigns = require('../controllers/campaigns.controller');

router.use(authMiddleware, apiLimiter);

router.get('/stats', campaigns.stats);

router.get(
  '/',
  [query('page').optional().isInt({ min: 1 }), query('perPage').optional().isInt({ min: 1, max: 100 })],
  validateRequest,
  campaigns.list
);

router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('type').trim().notEmpty(),
    body('startDate').notEmpty().withMessage('startDate obrigatório (ISO 8601)'),
  ],
  validateRequest,
  campaigns.create
);

router.get('/:id', [param('id').notEmpty()], validateRequest, campaigns.getOne);

router.put(
  '/:id',
  [param('id').notEmpty()],
  validateRequest,
  campaigns.updateFull
);

router.delete('/:id', [param('id').notEmpty()], validateRequest, campaigns.remove);

module.exports = router;
