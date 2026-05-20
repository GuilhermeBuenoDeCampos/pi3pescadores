const jwt = require('../utils/jwt');

function normalizeUserPayload(payload) {
  const id = payload?.id || payload?.sub || null;

  return {
    ...payload,
    id,
    sub: payload?.sub || id,
  };
}

module.exports = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type === 'Bearer' && token) {
    try {
      req.user = normalizeUserPayload(jwt.verify(token));
    } catch (error) {
      return next(error);
    }
  }

  return next();
};