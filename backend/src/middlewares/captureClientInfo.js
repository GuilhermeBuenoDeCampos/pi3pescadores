/**
 * Middleware para extrair informações do cliente (IP e User-Agent)
 */
function captureClientInfo(req, res, next) {
  // Extrair IP (considerando proxies)
  req.clientIp =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket?.remoteAddress ||
    'unknown';

  // Extrair User-Agent
  req.clientUserAgent = req.headers['user-agent'] || 'unknown';

  next();
}

module.exports = captureClientInfo;
