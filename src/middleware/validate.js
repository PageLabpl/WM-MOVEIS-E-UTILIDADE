const { validationResult } = require('express-validator');

/** Roda depois das regras do express-validator; se algo falhar, responde 400
 *  com mensagens claras em vez de deixar dados inválidos chegarem ao banco. */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos.',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
}

module.exports = { validate };
