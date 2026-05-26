'use strict';

const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../middlewares/appError');

exports.obterConfig = asyncHandler(async (req, res) => {
  const db = require('../database/models');
  const { v4: uuidv4 } = require('uuid');

  try {
    let config = await db.KpiConfig.findOne();

    // Se não existir, criar com valores padrão
    if (!config) {
      config = await db.KpiConfig.create({
        id: uuidv4(),
        faturamento_baixo: 500,
        faturamento_alto: 5000,
      });
    }

    res.json({
      data: {
        id: config.id,
        faturamento_baixo: parseFloat(config.faturamento_baixo),
        faturamento_alto: parseFloat(config.faturamento_alto),
      },
    });
  } catch (error) {
    // Se a tabela não existir, retornar valores padrão
    console.error('[kpiConfigController] Erro ao obter config:', error.message);
    res.json({
      data: {
        id: null,
        faturamento_baixo: 500,
        faturamento_alto: 5000,
      },
    });
  }
});

exports.atualizarConfig = asyncHandler(async (req, res) => {
  const db = require('../database/models');
  const { v4: uuidv4 } = require('uuid');
  const { faturamento_baixo, faturamento_alto } = req.body;

  console.log('[kpiConfigController] atualizarConfig - dados recebidos:', { faturamento_baixo, faturamento_alto });

  // Validações
  if (typeof faturamento_baixo !== 'number' || faturamento_baixo < 0) {
    throw new AppError('faturamento_baixo deve ser um número positivo', 400);
  }

  if (typeof faturamento_alto !== 'number' || faturamento_alto < 0) {
    throw new AppError('faturamento_alto deve ser um número positivo', 400);
  }

  if (faturamento_baixo >= faturamento_alto) {
    throw new AppError('faturamento_baixo deve ser menor que faturamento_alto', 400);
  }

  let config = await db.KpiConfig.findOne();

  if (!config) {
    console.log('[kpiConfigController] Criando nova config');
    config = await db.KpiConfig.create({
      id: uuidv4(),
      faturamento_baixo,
      faturamento_alto,
    });
  } else {
    console.log('[kpiConfigController] Atualizando config existente:', config.id);
    await config.update({
      faturamento_baixo,
      faturamento_alto,
    });
  }

  console.log('[kpiConfigController] Config salva:', config.toJSON());

  res.json({
    data: {
      id: config.id,
      faturamento_baixo: parseFloat(config.faturamento_baixo),
      faturamento_alto: parseFloat(config.faturamento_alto),
    },
  });
});
