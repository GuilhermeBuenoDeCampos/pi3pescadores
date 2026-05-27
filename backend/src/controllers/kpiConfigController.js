'use strict';

const asyncHandler = require('../utils/asyncHandler');
const kpiConfigService = require('../services/kpiConfigService');

exports.listar = asyncHandler(async (req, res) => {
  const config = await kpiConfigService.obterConfig();
  res.json({ data: config });
});

exports.atualizar = asyncHandler(async (req, res) => {
  const config = await kpiConfigService.atualizarConfig(req.body);
  res.json({ data: config });
});
