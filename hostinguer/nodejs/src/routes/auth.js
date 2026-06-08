const { Router } = require('express');
const usuarioController = require('../controllers/usuarioController');

const router = Router();

router.post('/cadastro', usuarioController.cadastrar);
router.get('/login', (req, res) => {
  res.status(405).json({
    error: {
      message: 'Use POST /api/auth/login para autenticar.',
    },
  });
});
router.post('/login', usuarioController.login);

module.exports = router;
