const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const reports = require('../controllers/reports.controller');

router.use(authMiddleware, apiLimiter);

router.get('/', reports.summary);
router.get('/summary', reports.summary);

module.exports = router;
