const { Router } = require('express');
const authenticateOptional = require('../middlewares/authenticateOptional');
const cartController = require('../controllers/carrinhoController');

const router = Router();

router.use(authenticateOptional);

router.get('/', cartController.obter);
router.post('/items', cartController.adicionarItem);
router.patch('/items/:id', cartController.atualizarItem);
router.delete('/items/:id', cartController.removerItem);

module.exports = router;
