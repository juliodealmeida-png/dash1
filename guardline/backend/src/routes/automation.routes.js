const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const automation = require('../controllers/automation.controller');

router.use(authMiddleware, apiLimiter);

router.get('/', automation.listRecipes);
router.get('/recipes', automation.listRecipes);
router.get('/logs', automation.listLogs);

module.exports = router;
