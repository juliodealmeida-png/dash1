const { fail } = require('../utils/response');

/**
 * Middleware de controle de acesso baseado em role.
 * Deve ser usado APÓS authMiddleware.
 * @param {...string} roles - roles permitidos (ex: 'founder', 'admin')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 401, 'Não autenticado', 'UNAUTHORIZED');
    }
    if (!roles.includes(req.user.role)) {
      return fail(
        res,
        403,
        `Acesso negado. Requer perfil: ${roles.join(' ou ')}. Seu perfil: ${req.user.role}`,
        'FORBIDDEN'
      );
    }
    next();
  };
}

module.exports = { requireRole };
