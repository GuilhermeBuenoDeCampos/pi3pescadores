const { Router } = require('express');
const pedidoController = require('../controllers/pedidoController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

router.use(authenticate);

router.post('/', pedidoController.criar);
router.get('/meus', pedidoController.listarMeus);
router.get('/meus/:id', pedidoController.detalharMeu);
router.get('/admin/faturamento-mensal', authorize('admin', 'funcionario'), pedidoController.faturamentoMensal);
router.get('/', authorize('admin', 'funcionario'), pedidoController.listarTodos);

router.get('/:id', authorize('admin', 'funcionario'), pedidoController.detalharAdmin);
router.patch('/:id/status', authorize('admin'), pedidoController.atualizarStatus);

module.exports = router;
