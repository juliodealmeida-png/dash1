const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const integrations = require('../controllers/integrations.controller');

/** OAuth redirect do Google — sem JWT (state assinado no JWT). */
router.get('/gmail/callback', integrations.gmailCallback);

router.use(authMiddleware, apiLimiter);

router.get('/', integrations.list);
router.get('/gmail/auth', integrations.gmailAuth);
router.post('/gmail/sync', integrations.syncGmail);
router.post('/slack/test', integrations.testSlack);
router.delete('/:type', integrations.disconnect);

module.exports = router;
