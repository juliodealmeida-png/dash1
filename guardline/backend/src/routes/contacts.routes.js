const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const contacts = require('../controllers/contacts.controller');

router.use(authMiddleware, apiLimiter);

router.get('/', contacts.list);
router.get('/:id', contacts.getOne);

module.exports = router;
