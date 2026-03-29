const { fail } = require('../utils/response');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const message =
    status === 500 && process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : err.message || 'Erro interno do servidor';

  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  }

  return fail(res, status, message, err.code || 'INTERNAL_ERROR', err.details);
}

module.exports = { errorHandler };
