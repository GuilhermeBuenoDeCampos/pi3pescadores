const { Router } = require('express');
const kpiConfigController = require('../controllers/kpiConfigController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

router.use(authenticate);

router.get('/', kpiConfigController.listar);
router.put('/', authorize('admin', 'funcionario'), kpiConfigController.atualizar);

module.exports = router;
