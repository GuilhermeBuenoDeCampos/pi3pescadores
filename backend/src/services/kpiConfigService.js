'use strict';

const db = require('../database/models');
const AppError = require('../middlewares/appError');

const DEFAULT_CONFIG = {
  faturamento_baixo: 500,
  faturamento_alto: 5000,
  ticketbaixo: 75,
  ticketalto: 200,
  recomprabaixa: 20,
  recompraalta: 50,
  visitantebaixo: 100,
  visitantealto: 500,
  conversaobaixa: 2,
  conversaoalta: 8,
};

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatConfig(config) {
  return {
    id: config?.id || null,
    faturamento_baixo: toNumber(config?.faturamento_baixo, DEFAULT_CONFIG.faturamento_baixo),
    faturamento_alto: toNumber(config?.faturamento_alto, DEFAULT_CONFIG.faturamento_alto),
    ticketbaixo: toNumber(config?.ticketbaixo, DEFAULT_CONFIG.ticketbaixo),
    ticketalto: toNumber(config?.ticketalto, DEFAULT_CONFIG.ticketalto),
    recomprabaixa: toNumber(config?.recomprabaixa, DEFAULT_CONFIG.recomprabaixa),
    recompraalta: toNumber(config?.recompraalta, DEFAULT_CONFIG.recompraalta),
    visitantebaixo: toNumber(config?.visitantebaixo, DEFAULT_CONFIG.visitantebaixo),
    visitantealto: toNumber(config?.visitantealto, DEFAULT_CONFIG.visitantealto),
    conversaobaixa: toNumber(config?.conversaobaixa, DEFAULT_CONFIG.conversaobaixa),
    conversaoalta: toNumber(config?.conversaoalta, DEFAULT_CONFIG.conversaoalta),
  };
}

function validateRange(low, high, lowName, highName) {
  if (!Number.isFinite(low) || low < 0) {
    throw new AppError(400, `${lowName} deve ser um numero positivo`);
  }

  if (!Number.isFinite(high) || high < 0) {
    throw new AppError(400, `${highName} deve ser um numero positivo`);
  }

  if (low >= high) {
    throw new AppError(400, `${lowName} deve ser menor que ${highName}`);
  }
}

exports.obterConfig = async () => {
  try {
    let config = await db.KpiConfig.findOne();

    if (!config) {
      config = await db.KpiConfig.create(DEFAULT_CONFIG);
    }

    return formatConfig(config);
  } catch (error) {
    console.error('[kpiConfigService] erro ao obter config:', error.message);
    return formatConfig(null);
  }
};

exports.atualizarConfig = async (body) => {
  const current = await exports.obterConfig();
  const payload = {
    faturamento_baixo: toNumber(body.faturamento_baixo, current.faturamento_baixo),
    faturamento_alto: toNumber(body.faturamento_alto, current.faturamento_alto),
    ticketbaixo: toNumber(body.ticketbaixo, current.ticketbaixo),
    ticketalto: toNumber(body.ticketalto, current.ticketalto),
    recomprabaixa: toNumber(body.recomprabaixa, current.recomprabaixa),
    recompraalta: toNumber(body.recompraalta, current.recompraalta),
    visitantebaixo: toNumber(body.visitantebaixo, current.visitantebaixo),
    visitantealto: toNumber(body.visitantealto, current.visitantealto),
    conversaobaixa: toNumber(body.conversaobaixa, current.conversaobaixa),
    conversaoalta: toNumber(body.conversaoalta, current.conversaoalta),
  };

  validateRange(payload.faturamento_baixo, payload.faturamento_alto, 'faturamento_baixo', 'faturamento_alto');
  validateRange(payload.ticketbaixo, payload.ticketalto, 'ticketbaixo', 'ticketalto');
  validateRange(payload.recomprabaixa, payload.recompraalta, 'recomprabaixa', 'recompraalta');
  validateRange(payload.visitantebaixo, payload.visitantealto, 'visitantebaixo', 'visitantealto');
  validateRange(payload.conversaobaixa, payload.conversaoalta, 'conversaobaixa', 'conversaoalta');

  let config = await db.KpiConfig.findOne();

  if (config) {
    config = await config.update(payload);
  } else {
    config = await db.KpiConfig.create(payload);
  }

  return formatConfig(config);
};
