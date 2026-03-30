const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { getProfile, upsertProfile } = require('../controllers/profile.controller');

const router = Router();
router.use(authMiddleware, apiLimiter);

router.get('/', getProfile);
router.put('/', upsertProfile);
router.patch('/', upsertProfile);

module.exports = router;
