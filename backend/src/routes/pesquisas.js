const { Router } = require('express');
const pesquisaController = require('../controllers/pesquisaController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

router.post('/', pesquisaController.registrar);
router.get('/mais-pesquisadas', authenticate, authorize('admin'), pesquisaController.maisPesquisadas);

module.exports = router;
