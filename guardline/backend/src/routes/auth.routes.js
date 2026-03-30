const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateRequest } = require('../middleware/validateRequest');
const authController = require('../controllers/auth.controller');

router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().withMessage('E-mail inválido'),
    body('password').isLength({ min: 8 }).withMessage('Senha mínimo 8 caracteres'),
    body('name').trim().notEmpty().withMessage('Nome obrigatório'),
    body('company').optional().trim(),
    body('role').optional().isIn(['founder', 'sdr', 'admin']),
  ],
  validateRequest,
  authController.register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('E-mail inválido'),
    body('password').notEmpty().withMessage('Senha obrigatória'),
  ],
  validateRequest,
  authController.login
);

router.post(
  '/refresh',
  authLimiter,
  [body('refreshToken').notEmpty().withMessage('refreshToken obrigatório')],
  validateRequest,
  authController.refresh
);

router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.me);
router.post('/bootstrap-admin', authController.bootstrapAdmin);

router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().withMessage('E-mail inválido')],
  validateRequest,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').notEmpty().withMessage('Token obrigatório'),
    body('password').isLength({ min: 8 }).withMessage('Senha mínimo 8 caracteres'),
  ],
  validateRequest,
  authController.resetPassword
);

module.exports = router;
