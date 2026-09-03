const multer = require('multer');

/** 404 para rotas inexistentes. */
function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Rota não encontrada.' });
}

/** Handler central de erros. Em produção nunca expõe stack trace ou
 *  detalhes internos do banco/servidor ao cliente — apenas loga no servidor. */
function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'Erro no upload: ' + err.message });
  }

  const isProd = process.env.NODE_ENV === 'production';
  console.error('[ERRO]', new Date().toISOString(), err.message, isProd ? '' : err.stack);

  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Erro interno do servidor.' : err.message
  });
}

module.exports = { notFoundHandler, errorHandler };
