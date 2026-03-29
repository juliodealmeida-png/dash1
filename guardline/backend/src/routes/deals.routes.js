const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { validateRequest } = require('../middleware/validateRequest');
const deals = require('../controllers/deals.controller');
const { STAGE_LABELS } = require('../controllers/deals.constants');

const stageValues = Object.keys(STAGE_LABELS);

router.use(authMiddleware, apiLimiter);

router.get('/stats/pipeline', deals.pipelineStats);

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('perPage').optional().isInt({ min: 1, max: 100 }),
    query('minValue').optional().isFloat(),
    query('maxValue').optional().isFloat(),
    query('minRisk').optional().isInt({ min: 0, max: 100 }),
    query('maxRisk').optional().isInt({ min: 0, max: 100 }),
  ],
  validateRequest,
  deals.list
);

router.post(
  '/',
  [
    body('companyName').trim().notEmpty().withMessage('companyName obrigatório'),
    body('title').optional().trim(),
    body('value').optional().isFloat(),
    body('stage').optional().isIn(stageValues),
    body('probability').optional().isInt({ min: 0, max: 100 }),
  ],
  validateRequest,
  deals.create
);

router.get('/:id/activities', [param('id').notEmpty()], validateRequest, deals.listActivities);

router.post(
  '/:id/activities',
  [
    param('id').notEmpty(),
    body('title').optional().trim(),
    body('type').optional().trim(),
    body('note').optional().trim(),
  ],
  validateRequest,
  deals.createActivity
);

router.patch(
  '/:id/stage',
  [
    param('id').notEmpty(),
    body('stage').isIn(stageValues).withMessage('Estágio inválido'),
    body('note').optional().trim(),
  ],
  validateRequest,
  deals.updateStage
);

router.patch('/:id/risk', [param('id').notEmpty()], validateRequest, deals.updateRisk);

router.get('/:id', [param('id').notEmpty()], validateRequest, deals.getOne);

router.put(
  '/:id',
  [param('id').notEmpty(), body('stage').optional().isIn(stageValues)],
  validateRequest,
  deals.updateFull
);

router.delete('/:id', [param('id').notEmpty()], validateRequest, deals.remove);

module.exports = router;
