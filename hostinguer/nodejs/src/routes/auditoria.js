const { Router } = require('express');
const auditoriaController = require('../controllers/auditoriaController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

// All audit routes require admin or funcionario
router.get('/aleatorios', authenticate, authorize('admin', 'funcionario'), auditoriaController.getProdutosAleatorios);
router.post('/salvar', authenticate, authorize('admin', 'funcionario'), auditoriaController.salvarAuditoria);
router.get('/historico', authenticate, authorize('admin', 'funcionario'), auditoriaController.getHistoricoAuditoria);
router.get('/acuracidade-media', authenticate, authorize('admin', 'funcionario'), auditoriaController.getMediaAcuracidade);

module.exports = router;
