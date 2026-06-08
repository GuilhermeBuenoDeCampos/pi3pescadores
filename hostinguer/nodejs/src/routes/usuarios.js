const { Router } = require('express');
const usuarioController = require('../controllers/usuarioController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

router.get('/', authenticate, authorize('admin'), usuarioController.listar);
router.get('/:id', authenticate, authorize('admin'), usuarioController.detalhar);
router.post('/', authenticate, authorize('admin'), usuarioController.criar);
router.put('/:id', authenticate, authorize('admin'), usuarioController.atualizar);
router.delete('/:id', authenticate, authorize('admin'), usuarioController.excluir);

module.exports = router;
