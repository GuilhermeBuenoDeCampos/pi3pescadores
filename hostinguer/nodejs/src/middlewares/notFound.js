const AppError = require('./appError');

module.exports = (req, res, next) => {
  next(new AppError(404, 'Route not found'));
};
