'use strict';

const asyncHandler = require('../utils/asyncHandler');
const faturamentoCompletoService = require('../services/faturamentoCompletoService');

exports.resumo = asyncHandler(async (req, res) => {
  const data = await faturamentoCompletoService.obterResumo();
  res.json({ data });
});

exports.porCategoria = asyncHandler(async (req, res) => {
  const data = await faturamentoCompletoService.obterPorCategoria();
  res.json({ data });
});

exports.topProdutos = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const data = await faturamentoCompletoService.obterTopProdutos(limit);
  res.json({ data });
});

exports.comparativoAnual = asyncHandler(async (req, res) => {
  const data = await faturamentoCompletoService.obterComparativoAnual();
  res.json({ data });
});

exports.metaRealizado = asyncHandler(async (req, res) => {
  const data = await faturamentoCompletoService.obterMetaRealizado();
  res.json({ data });
});

exports.porMetodoPagamento = asyncHandler(async (req, res) => {
  const data = await faturamentoCompletoService.obterPorMetodoPagamento();
  res.json({ data });
});
