const asyncHandler = require('../utils/asyncHandler');
const pesquisaService = require('../services/pesquisaService');

exports.registrar = asyncHandler(async (req, res) => {
  const pesquisa = await pesquisaService.registrarPalavra(req.body);

  res.status(201).json({
    data: pesquisa,
  });
});

exports.maisPesquisadas = asyncHandler(async (req, res) => {
  const palavras = await pesquisaService.listarMaisPesquisadas(req.query.limit);

  res.json({
    data: palavras,
  });
});
