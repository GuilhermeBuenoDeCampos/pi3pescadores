const AppError = require('./appError');

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.tipo_usuario)) {
      return next(new AppError(403, 'Acesso restrito. Permissão insuficiente.'));
    }

    return next();
  };
}

module.exports = authorize;
