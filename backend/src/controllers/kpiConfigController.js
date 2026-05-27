'use strict';

const asyncHandler = require('../utils/asyncHandler');
const kpiConfigService = require('../services/kpiConfigService');

exports.obterConfig = asyncHandler(async (req, res) => {
  const config = await kpiConfigService.obterConfig();
  res.json({ data: config });
});

exports.atualizarConfig = asyncHandler(async (req, res) => {
  const config = await kpiConfigService.atualizarConfig(req.body);
  res.json({ data: config });
});

exports.listar = exports.obterConfig;
exports.atualizar = exports.atualizarConfig;
