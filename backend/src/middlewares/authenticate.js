const AppError = require('./appError');
const jwt = require('../utils/jwt');
const db = require('../database/models');
const asyncHandler = require('../utils/asyncHandler');

module.exports = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    throw new AppError(401, 'Authentication token is required');
  }

  const payload = jwt.verify(token);
  req.user = payload;

  const usuario = await db.Usuario.findByPk(payload.sub, { attributes: ['ativo'] });
  if (!usuario || usuario.ativo !== true) {
    throw new AppError(401, 'Conta desativada');
  }

  return next();
});
