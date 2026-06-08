const AppError = require('./appError');

module.exports = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error instanceof AppError ? error.message : 'Unexpected server error';

  if (statusCode === 500) {
    console.error(error);
  }

  return res.status(statusCode).json({
    error: {
      message,
    },
  });
};
