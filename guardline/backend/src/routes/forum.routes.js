const { Router } = require('express');
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { listMessages, createMessage, deleteMessage } = require('../controllers/forum.controller');

const router = Router();
router.use(authMiddleware, apiLimiter);

router.get('/', listMessages);
router.post('/', createMessage);
router.delete('/:id', deleteMessage);

module.exports = router;
