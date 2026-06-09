const AppError = require('./appError');

module.exports = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = error instanceof AppError ? error.statusCode : 500;
  let message = error instanceof AppError ? error.message : 'Unexpected server error';

  if (error?.name === 'MulterError') {
    statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;

    if (error.code === 'LIMIT_FILE_SIZE') {
      message = 'Cada imagem deve ter no maximo 15 MB.';
    } else if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Envie no maximo 10 imagens por vez.';
    } else {
      message = 'Nao foi possivel processar as imagens enviadas.';
    }
  }

  if (statusCode === 500) {
    console.error(error);
  }

  return res.status(statusCode).json({
    error: {
      message,
    },
  });
};
