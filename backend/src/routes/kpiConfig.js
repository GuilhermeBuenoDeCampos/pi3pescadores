const { Router } = require('express');
const kpiConfigController = require('../controllers/kpiConfigController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

router.get('/', kpiConfigController.obterConfig);

router.use(authenticate);
router.patch('/', authorize('admin', 'funcionario'), kpiConfigController.atualizarConfig);
router.put('/', authorize('admin', 'funcionario'), kpiConfigController.atualizarConfig);

module.exports = router;
