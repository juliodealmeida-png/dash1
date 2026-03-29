const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { validateRequest } = require('../middleware/validateRequest');
const investor = require('../controllers/investor.controller');

const stages = [
  'cold_outreach',
  'first_meeting',
  'interest_confirmed',
  'term_sheet',
  'due_diligence',
  'closed',
];

router.use(authMiddleware, apiLimiter);

router.get('/deals/kanban', investor.kanban);

router.get(
  '/deals',
  [query('page').optional().isInt({ min: 1 }), query('perPage').optional().isInt({ min: 1, max: 100 })],
  validateRequest,
  investor.list
);

router.post(
  '/deals',
  [
    body('investorName').trim().notEmpty(),
    body('stage').optional().isIn(stages),
    body('probability').optional().isInt({ min: 0, max: 100 }),
  ],
  validateRequest,
  investor.create
);

router.get('/deals/:id', [param('id').notEmpty()], validateRequest, investor.getOne);

router.put(
  '/deals/:id',
  [
    param('id').notEmpty(),
    body('stage').optional().isIn(stages),
    body('probability').optional().isInt({ min: 0, max: 100 }),
  ],
  validateRequest,
  investor.updateFull
);

router.delete('/deals/:id', [param('id').notEmpty()], validateRequest, investor.remove);

module.exports = router;
