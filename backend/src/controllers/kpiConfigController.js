'use strict';

const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../middlewares/appError');

exports.obterConfig = asyncHandler(async (req, res) => {
  const db = require('../database/models');

  try {
    let config = await db.KpiConfig.findOne();

    // Se não existir, criar com valores padrão
    if (!config) {
      config = await db.KpiConfig.create({
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
  const { faturamento_baixo, faturamento_alto } = req.body;

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

  try {
    let config = await db.KpiConfig.findOne();

    if (!config) {
      config = await db.KpiConfig.create({
        faturamento_baixo,
        faturamento_alto,
      });
    } else {
      config = await config.update({
        faturamento_baixo,
        faturamento_alto,
        atualizado_em: new Date(),
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
    console.error('[kpiConfigController] Erro ao atualizar config:', error.message);
    // Se a tabela não existir, apenas retornar os valores recebidos
    res.json({
      data: {
        id: null,
        faturamento_baixo: parseFloat(faturamento_baixo),
        faturamento_alto: parseFloat(faturamento_alto),
      },
    });
  }
});
