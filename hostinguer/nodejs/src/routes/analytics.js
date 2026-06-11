const { Router } = require('express');
const analyticsController = require('../controllers/analyticsController');
const authenticate = require('../middlewares/authenticate');
const authenticateOptional = require('../middlewares/authenticateOptional');
const authorize = require('../middlewares/authorize');

const router = Router();

router.post('/track', authenticateOptional, analyticsController.registrarEventos);

router.get('/page-time', authenticate, authorize('admin', 'funcionario'), analyticsController.obterTempoPorPagina);
router.get('/heatmap', authenticate, authorize('admin', 'funcionario'), analyticsController.obterHeatmap);
router.get('/paginas-engajamento', authenticate, authorize('admin', 'funcionario'), analyticsController.obterPaginasComMaisCliques);
router.get('/estatisticas', authenticate, authorize('admin', 'funcionario'), analyticsController.obterEstatisticas);
router.get('/usuarios-por-mes', authenticate, authorize('admin', 'funcionario'), analyticsController.listarUsuariosPorMes);
router.get('/usuarios/:usuarioId/paginas', authenticate, authorize('admin', 'funcionario'), analyticsController.obterPaginasPorUsuario);
router.get('/usuarios/:usuarioId/heatmap', authenticate, authorize('admin', 'funcionario'), analyticsController.obterHeatmapPorUsuarioPagina);

module.exports = router;
