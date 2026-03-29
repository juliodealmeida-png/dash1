const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const metrics = require('../controllers/metrics.controller');

router.use(authMiddleware, apiLimiter);

router.get('/dashboard', metrics.dashboard);
router.get('/summary', metrics.summary);

module.exports = router;
