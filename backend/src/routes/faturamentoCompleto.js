const { Router } = require('express');
const faturamentoCompletoController = require('../controllers/faturamentoCompletoController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

router.get('/resumo', authenticate, authorize('admin', 'funcionario'), faturamentoCompletoController.resumo);
router.get('/por-categoria', authenticate, authorize('admin', 'funcionario'), faturamentoCompletoController.porCategoria);
router.get('/top-produtos', authenticate, authorize('admin', 'funcionario'), faturamentoCompletoController.topProdutos);
router.get('/comparativo-anual', authenticate, authorize('admin', 'funcionario'), faturamentoCompletoController.comparativoAnual);
router.get('/meta-realizado', authenticate, authorize('admin', 'funcionario'), faturamentoCompletoController.metaRealizado);
router.get('/por-metodo-pagamento', authenticate, authorize('admin', 'funcionario'), faturamentoCompletoController.porMetodoPagamento);

module.exports = router;
