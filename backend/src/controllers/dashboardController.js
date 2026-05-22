'use strict';

const asyncHandler = require('../utils/asyncHandler');
const dashboardService = require('../services/dashboardService');

exports.financeiro = asyncHandler(async (req, res) => {
  const data = await dashboardService.getFinanceiro(req.query);
  res.json({ data });
});

exports.faturamentoMensal = asyncHandler(async (req, res) => {
  const data = await dashboardService.getFaturamentoMensal(req.query);
  res.json({ data });
});

exports.produtosMaisVendidos = asyncHandler(async (req, res) => {
  const data = await dashboardService.getProdutosMaisVendidos(req.query);
  res.json({ data });
});

exports.categorias = asyncHandler(async (req, res) => {
  const data = await dashboardService.getCategorias(req.query);
  res.json({ data });
});

exports.vendasPorPeriodo = asyncHandler(async (req, res) => {
  const data = await dashboardService.getVendasPorPeriodo(req.query);
  res.json({ data });
});
