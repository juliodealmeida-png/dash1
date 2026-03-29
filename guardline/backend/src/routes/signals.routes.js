const express = require('express');
const { query } = require('express-validator');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { validateRequest } = require('../middleware/validateRequest');
const signals = require('../controllers/signals.controller');

router.use(authMiddleware, apiLimiter);

router.patch('/read-all', signals.markAllRead);

router.get(
  '/',
  [query('take').optional().isInt({ min: 1, max: 200 })],
  validateRequest,
  signals.list
);

router.patch('/:id/read', signals.markRead);

module.exports = router;
