const { Router } = require('express');
const leadtimeController = require('../controllers/leadtimeController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

router.get('/', leadtimeController.obterMediaLeadtime);
router.get('/periodo', leadtimeController.obterLeadtimePorPeriodo);

router.use(authenticate);
router.post('/', authorize('admin', 'funcionario'), leadtimeController.registrarEventoLeadtime);

module.exports = router;
