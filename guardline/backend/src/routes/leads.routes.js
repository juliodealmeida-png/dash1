const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { validateRequest } = require('../middleware/validateRequest');
const leads = require('../controllers/leads.controller');

router.use(authMiddleware, apiLimiter);

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('perPage').optional().isInt({ min: 1, max: 100 }),
    query('minScore').optional().isInt({ min: 0, max: 100 }),
    query('maxScore').optional().isInt({ min: 0, max: 100 }),
  ],
  validateRequest,
  leads.list
);

router.post(
  '/import',
  [body('csv').optional().isString(), body('text').optional().isString()],
  (req, res, next) => {
    if (!req.body.csv && !req.body.text) {
      return res.status(400).json({
        success: false,
        error: 'Envie csv ou text com o CSV',
        code: 'VALIDATION_ERROR',
      });
    }
    next();
  },
  leads.importCsv
);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('name obrigatório'),
    body('email').optional().isEmail(),
    body('source').optional().trim(),
  ],
  validateRequest,
  leads.create
);

router.get('/:id', [param('id').notEmpty()], validateRequest, leads.getOne);

router.put(
  '/:id',
  [
    param('id').notEmpty(),
    body('email').optional().isEmail(),
    body('rescore').optional().isBoolean(),
  ],
  validateRequest,
  leads.updateFull
);

router.patch(
  '/:id',
  [param('id').notEmpty(), body('email').optional().isEmail()],
  validateRequest,
  leads.updateFull
);

router.post(
  '/:id/enrich',
  [param('id').notEmpty()],
  validateRequest,
  leads.enrich
);

router.patch(
  '/:id/convert',
  [
    param('id').notEmpty(),
    body('value').optional().isFloat(),
    body('stage').optional().trim(),
  ],
  validateRequest,
  leads.convert
);

router.delete('/:id', [param('id').notEmpty()], validateRequest, leads.remove);

module.exports = router;
