const { Router } = require('express');
const kpiConfigController = require('../controllers/kpiConfigController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

// Rota pública para obter configuração
router.get('/', kpiConfigController.obterConfig);

// Rota protegida para atualizar configuração
router.use(authenticate);
router.patch('/', authorize('admin'), kpiConfigController.atualizarConfig);

module.exports = router;
