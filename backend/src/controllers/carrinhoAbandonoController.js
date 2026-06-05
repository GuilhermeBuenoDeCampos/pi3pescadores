'use strict';

const asyncHandler = require('../utils/asyncHandler');
const carrinhoAbandonoService = require('../services/carrinhoAbandonoService');

exports.dashboard = asyncHandler(async (req, res) => {
  const data = await carrinhoAbandonoService.obterDashboard(req.query);
  res.json(data);
});

exports.mensal = asyncHandler(async (req, res) => {
  const data = await carrinhoAbandonoService.obterRelatorioMensal(req.query);
  res.json(data);
});
