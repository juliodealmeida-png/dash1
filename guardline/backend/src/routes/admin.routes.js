const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const requireRole = require('../middleware/requireRole');
const admin = require('../controllers/admin.controller');

router.use(authMiddleware, apiLimiter, requireRole('admin'));

router.get('/users', admin.listUsers);
router.patch('/users/:id/modules', admin.updateUserModules);

router.get('/approvals', admin.listApprovals);
router.post('/approvals/:id/approve', admin.approveRequest);
router.post('/approvals/:id/reject', admin.rejectRequest);

module.exports = router;

