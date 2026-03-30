const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const connectors = require('../controllers/connectors.controller');

// N8N endpoint (doesn't use standard JWT auth, uses API key instead)
router.get('/credentials', connectors.getCredentialsForN8n);

// Frontend endpoints (protected by user JWT)
router.use(authMiddleware, apiLimiter);

router.post('/:type', connectors.saveCredentials);
router.delete('/:type', connectors.disconnect);

module.exports = router;
