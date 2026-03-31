const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const tools = require('../controllers/tools.controller');

router.use(authMiddleware, apiLimiter);

router.get('/weather', tools.weather);
router.get('/forex', tools.forex);
router.get('/news', tools.news);
router.post('/doc', tools.createDoc);
router.post('/image', tools.createImage);

module.exports = router;

