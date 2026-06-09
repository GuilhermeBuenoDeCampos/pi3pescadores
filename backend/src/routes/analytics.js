const { Router } = require('express');
const analyticsController = require('../controllers/analyticsController');
const authenticate = require('../middlewares/authenticate');
const authenticateOptional = require('../middlewares/authenticateOptional');
const authorize = require('../middlewares/authorize');

const router = Router();

router.post('/track', authenticateOptional, analyticsController.registrarEventos);

router.get('/page-time', authenticate, authorize('admin'), analyticsController.obterTempoPorPagina);
router.get('/heatmap', authenticate, authorize('admin'), analyticsController.obterHeatmap);
router.get('/paginas-engajamento', authenticate, authorize('admin'), analyticsController.obterPaginasComMaisCliques);
router.get('/estatisticas', authenticate, authorize('admin'), analyticsController.obterEstatisticas);

module.exports = router;
