const { Router } = require('express');
const categoriaController = require('../controllers/categoriaController');

const router = Router();

router.get('/', categoriaController.listar);
router.get('/:id', categoriaController.detalhar);
router.post('/', categoriaController.criar);

module.exports = router;
