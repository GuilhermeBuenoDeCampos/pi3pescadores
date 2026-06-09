const asyncHandler = require('../utils/asyncHandler');
const avaliacaoService = require('../services/avaliacaoService');

exports.criar = asyncHandler(async (req, res) => {
  const avaliacao = await avaliacaoService.criarAvaliacao(req.user, req.body);

  res.status(201).json({
    data: avaliacao,
  });
});

exports.obterMinhaAvaliacao = asyncHandler(async (req, res) => {
  const avaliacao = await avaliacaoService.buscarMinhaAvaliacao(req.user, req.params.pedidoId);

  res.json({
    data: avaliacao,
  });
});

exports.obterKpiSatisfacao = asyncHandler(async (req, res) => {
  const kpis = await avaliacaoService.obterKpisSatisfacao();

  res.json({
    data: kpis,
  });
});