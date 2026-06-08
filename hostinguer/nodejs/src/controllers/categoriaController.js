const asyncHandler = require('../utils/asyncHandler');
const categoriaService = require('../services/categoriaService');

function parseId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

exports.listar = asyncHandler(async (req, res) => {
  const categorias = await categoriaService.listarCategorias();

  res.json({
    data: categorias,
  });
});

exports.detalhar = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: { message: 'Invalid categoria id' },
    });
  }

  const categoria = await categoriaService.buscarCategoriaPorId(id);

  res.json({
    data: categoria,
  });
});

exports.criar = asyncHandler(async (req, res) => {
  const categoria = await categoriaService.criarCategoria(req.body);

  res.status(201).json({
    data: categoria,
  });
});
