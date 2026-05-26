const { Router } = require('express');
const pedidoController = require('../controllers/pedidoController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

// Rota de debug pública - sem autenticação
router.get('/public/debug-pedidos', pedidoController.debugPedidos);

router.use(authenticate);

router.post('/', pedidoController.criar);
router.get('/meus', pedidoController.listarMeus);
router.get('/meus/:id', pedidoController.detalharMeu);

// Rota de debug - verificar pedidos no banco
router.get('/admin/debug-pedidos', authorize('admin', 'funcionario'), pedidoController.debugPedidos);

// Rotas admin (mais específicas, devem vir antes de /:id)
router.get('/admin/faturamento-mensal', authorize('admin', 'funcionario'), pedidoController.faturamentoMensal);

// Rotas genéricas (menos específicas)
router.get('/', authorize('admin', 'funcionario'), pedidoController.listarTodos);
router.get('/:id', authorize('admin', 'funcionario'), pedidoController.detalharAdmin);
router.patch('/:id/status', authorize('admin'), pedidoController.atualizarStatus);

module.exports = router;
