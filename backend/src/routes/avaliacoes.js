const { Router } = require('express');
const avaliacaoController = require('../controllers/avaliacaoController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

router.use(authenticate);
router.post('/', authorize('cliente'), avaliacaoController.criar);
router.get('/meus/:pedidoId', authorize('cliente'), avaliacaoController.obterMinhaAvaliacao);

module.exports = router;