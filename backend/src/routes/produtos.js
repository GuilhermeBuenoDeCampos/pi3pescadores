const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const produtoController = require('../controllers/produtoController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Public routes (read-only)
router.get('/', produtoController.listar);
router.get('/nome/:nome', produtoController.detalharPorNome);
router.get('/:id', produtoController.detalhar);

// Protected routes (admin/funcionario only)
router.post('/', authenticate, authorize('admin', 'funcionario'), upload.array('imagens', 10), produtoController.criar);
router.post('/:id/imagens', authenticate, authorize('admin', 'funcionario'), produtoController.adicionarImagem);
router.post('/:id/movimentacoes', authenticate, authorize('admin', 'funcionario'), produtoController.registrarMovimentacao);
router.put('/:id', authenticate, authorize('admin', 'funcionario'), upload.array('imagens', 10), produtoController.atualizar);
router.post('/:id', authenticate, authorize('admin', 'funcionario'), upload.array('imagens', 10), produtoController.atualizar);
router.post('/movimentacoes/massa', authenticate, authorize('admin', 'funcionario'), produtoController.registrarMovimentacoesEmMassa);

module.exports = router;
