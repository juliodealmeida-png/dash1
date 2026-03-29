/**
 * Padrão de resposta da API (Etapa 2).
 */
function ok(res, data, meta, status = 200) {
  const body = { success: true, data };
  if (meta != null && typeof meta === 'object') body.meta = meta;
  return res.status(status).json(body);
}

function fail(res, status, error, code, details) {
  const body = { success: false, error: error || 'Erro' };
  if (code) body.code = code;
  if (details != null) body.details = details;
  return res.status(status).json(body);
}

module.exports = { ok, fail };
