'use strict';

const asyncHandler = require('../utils/asyncHandler');
const carrinhoAbandonoService = require('../services/carrinhoAbandonoService');

const dashboard = asyncHandler(async (req, res) => {
  const data = await carrinhoAbandonoService.obterDashboard(req.query);
  return res.json(data);
});

const mensal = asyncHandler(async (req, res) => {
  const data = await carrinhoAbandonoService.obterRelatorioMensal(req.query);
  return res.json(data);
});

module.exports = {
  dashboard,
  mensal,
};
