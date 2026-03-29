const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const meetings = require('../controllers/meetings.controller');

router.use(authMiddleware, apiLimiter);

router.get('/', meetings.list);
router.post('/', meetings.create);

module.exports = router;
