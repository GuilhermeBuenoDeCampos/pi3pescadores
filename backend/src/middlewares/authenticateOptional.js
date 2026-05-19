const jwt = require('../utils/jwt');

module.exports = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type === 'Bearer' && token) {
    try {
      req.user = jwt.verify(token);
    } catch (error) {
      return next(error);
    }
  }

  return next();
};