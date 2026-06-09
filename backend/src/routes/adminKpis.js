const { Router } = require('express');
const avaliacaoController = require('../controllers/avaliacaoController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

router.use(authenticate);
router.get('/satisfacao', authorize('admin'), avaliacaoController.obterKpiSatisfacao);

module.exports = router;