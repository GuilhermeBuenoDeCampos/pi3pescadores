const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const produtoController = require('../controllers/produtoController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/jfif', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.jpe', '.jfif', '.pjpeg', '.png', '.webp', '.avif']);

function imageFileFilter(req, file, cb) {
  const extension = path.extname(file.originalname || '').toLowerCase();

  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype) || ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    return cb(null, true);
  }

  return cb(new Error('Apenas imagens JPEG, JFIF, PNG, WEBP ou AVIF são permitidas.'));
}

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: imageFileFilter,
});

router.get('/', produtoController.listar);
router.get('/nome/:nome', produtoController.detalharPorNome);
router.get('/:id', produtoController.detalhar);

router.post('/', authenticate, authorize('admin', 'funcionario'), upload.array('imagens', 10), produtoController.criar);
router.post('/:id/imagens', authenticate, authorize('admin', 'funcionario'), produtoController.adicionarImagem);
router.post('/:id/movimentacoes', authenticate, authorize('admin', 'funcionario'), produtoController.registrarMovimentacao);
router.put('/:id', authenticate, authorize('admin', 'funcionario'), upload.array('imagens', 10), produtoController.atualizar);
router.post('/:id', authenticate, authorize('admin', 'funcionario'), upload.array('imagens', 10), produtoController.atualizar);
router.post('/movimentacoes/massa', authenticate, authorize('admin', 'funcionario'), produtoController.registrarMovimentacoesEmMassa);

module.exports = router;
