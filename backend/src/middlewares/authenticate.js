const AppError = require('./appError');
const jwt = require('../utils/jwt');
const db = require('../database/models');
const asyncHandler = require('../utils/asyncHandler');

function normalizeUserPayload(payload) {
  const id = payload?.id || payload?.sub || null;

  return {
    ...payload,
    id,
    sub: payload?.sub || id,
  };
}

module.exports = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    throw new AppError(401, 'Authentication token is required');
  }

  const payload = normalizeUserPayload(jwt.verify(token));
  req.user = payload;

  const usuario = await db.Usuario.findByPk(payload.id, { attributes: ['ativo'] });
  if (!usuario || usuario.ativo !== true) {
    throw new AppError(401, 'Conta desativada');
  }

  return next();
});
