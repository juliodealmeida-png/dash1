const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const wf = require('../controllers/wf_executions.controller');

router.use(authMiddleware, apiLimiter);

router.get('/', wf.list);

module.exports = router;
