const jwt = require('../utils/jwt');

module.exports = (req, res, next) => {
  // Lê o token opcional no padrão Authorization: Bearer <token>.
  const header = req.headers.authorization || '';
  const [type, headerToken] = header.split(' ');
  const token = type === 'Bearer' && headerToken ? headerToken : req.body?.auth_token;

  if (token) {
    try {
      // Quando enviado, o token precisa ser válido para popular req.user.
      req.user = jwt.verify(token);
    } catch (error) {
      // Mantém o mesmo contrato do middleware obrigatório para sessão expirada.
      if (error.message === 'Expired token') {
        return res.status(401).json({ error: 'Expired token' });
      }

      return next(error);
    }
  }

  return next();
};
