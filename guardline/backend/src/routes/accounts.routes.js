const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const accounts = require('../controllers/accounts.controller');

router.use(authMiddleware, apiLimiter);

router.get('/', accounts.list);

module.exports = router;
