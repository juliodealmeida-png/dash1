const { validationResult } = require('express-validator');
const { fail } = require('../utils/response');

function validateRequest(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return fail(res, 400, 'Erro de validação', 'VALIDATION_ERROR', result.array());
  }
  next();
}

module.exports = { validateRequest };
