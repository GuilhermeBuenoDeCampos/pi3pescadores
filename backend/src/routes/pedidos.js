const { Router } = require('express');
const pedidoController = require('../controllers/pedidoController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

router.use(authenticate);

router.post('/', pedidoController.criar);
router.get('/meus', pedidoController.listarMeus);
router.get('/meus/:id', pedidoController.detalharMeu);

// Rotas admin (mais específicas, devem vir antes de /:id)
router.get('/admin/faturamento-mensal', authorize('admin', 'funcionario'), pedidoController.faturamentoMensal);
router.get('/admin/taxa-recompra-anual', authorize('admin', 'funcionario'), pedidoController.taxaRecompraAnual);
router.get('/admin/ticket-medio', authorize('admin', 'funcionario'), pedidoController.ticketMedio);

// Rotas genéricas (menos específicas)
router.get('/', authorize('admin', 'funcionario'), pedidoController.listarTodos);
router.get('/:id', authorize('admin', 'funcionario'), pedidoController.detalharAdmin);
router.patch('/:id/status', authorize('admin'), pedidoController.atualizarStatus);

module.exports = router;
