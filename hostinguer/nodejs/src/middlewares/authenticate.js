const AppError = require('./appError');
const jwt = require('../utils/jwt');
const db = require('../database/models');
const asyncHandler = require('../utils/asyncHandler');

module.exports = asyncHandler(async (req, res, next) => {
  // Lê o header Authorization no formato esperado: "Bearer <token>".
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  // Bloqueia a requisição quando o token não foi enviado corretamente.
  if (type !== 'Bearer' || !token) {
    throw new AppError(401, 'Authentication token is required');
  }

  let payload;

  try {
    // Valida assinatura e expiração do JWT manual usado pelo projeto.
    payload = jwt.verify(token);
  } catch (error) {
    // A expiração precisa ter o formato exato consumido pelo frontend.
    if (error.message === 'Expired token') {
      return res.status(401).json({ error: 'Expired token' });
    }

    // Qualquer outra falha de validação é tratada como token inválido.
    throw new AppError(401, 'Invalid authentication token');
  }

  // Disponibiliza o payload do token para controllers e services seguintes.
  req.user = payload;

  // Confirma que o usuário do token ainda existe e está ativo no banco.
  const usuario = await db.Usuario.findByPk(payload.sub, { attributes: ['ativo'] });
  if (!usuario || usuario.ativo !== true) {
    throw new AppError(401, 'Conta desativada');
  }

  return next();
});
