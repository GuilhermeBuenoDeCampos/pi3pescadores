const { Router } = require('express');
const authenticate = require('../middlewares/authenticate');
const enderecoController = require('../controllers/enderecoController');

const router = Router();

router.use(authenticate);

router.get('/', enderecoController.listar);
router.post('/', enderecoController.criar);
router.put('/:id', enderecoController.atualizar);
router.delete('/:id', enderecoController.excluir);
router.patch('/:id/principal', enderecoController.definirPrincipal);

module.exports = router;