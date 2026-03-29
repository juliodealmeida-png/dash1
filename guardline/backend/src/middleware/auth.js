const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { fail } = require('../utils/response');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return fail(res, 401, 'Token de autenticação não fornecido', 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        avatar: true,
      },
    });

    if (!user) {
      return fail(res, 401, 'Usuário não encontrado', 'USER_NOT_FOUND');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return fail(res, 401, 'Token expirado', 'TOKEN_EXPIRED');
    }
    return fail(res, 401, 'Token inválido', 'TOKEN_INVALID');
  }
};

module.exports = { authMiddleware };
