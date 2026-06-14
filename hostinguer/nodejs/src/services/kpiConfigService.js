'use strict';

const { randomUUID } = require('crypto');
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
  abandonobaixa: 30,
  abandonoalta: 60,
  cancelamentobaixa: 5,
  cancelamentoalta: 15,
  satisfacaobaixa: 3,
  satisfacaoalta: 4,
  combagembaixa: 2,
  combagemalta: 5,
};

const DB_KEYS = {
  faturamento_baixo: 'faturamento_baixo',
  faturamento_alto: 'faturamento_alto',
  ticketbaixo: 'ticketbaixo',
  ticketalto: 'ticketalto',
  recomprabaixa: 'recompra_baixa',
  recompraalta: 'recompra_alta',
  visitantebaixo: 'visitante_baixo',
  visitantealto: 'visitante_alto',
  conversaobaixa: 'conversao_baixa',
  conversaoalta: 'conversao_alta',
  abandonobaixa: 'abandono_baixa',
  abandonoalta: 'abandono_alta',
  cancelamentobaixa: 'cancelamento_baixa',
  cancelamentoalta: 'cancelamento_alta',
  satisfacaobaixa: 'satisfacao_baixa',
  satisfacaoalta: 'satisfacao_alta',
  combagembaixa: 'combagem_baixa',
  combagemalta: 'combagem_alta',
};

const DESCRIPTIONS = {
  faturamento_baixo: 'Limite baixo de faturamento',
  faturamento_alto: 'Limite alto de faturamento',
  ticketbaixo: 'Ticket minimo',
  ticketalto: 'Ticket maximo',
  recomprabaixa: 'Taxa de recompra baixa',
  recompraalta: 'Taxa de recompra alta',
  visitantebaixo: 'Visitantes minimo',
  visitantealto: 'Visitantes maximo',
  conversaobaixa: 'Taxa de conversao baixa %',
  conversaoalta: 'Taxa de conversao alta %',
  abandonobaixa: 'Taxa de abandono baixa %',
  abandonoalta: 'Taxa de abandono alta %',
  cancelamentobaixa: 'Taxa de cancelamento baixa %',
  cancelamentoalta: 'Taxa de cancelamento alta %',
  satisfacaobaixa: 'Media de satisfacao baixa',
  satisfacaoalta: 'Media de satisfacao alta',
  combagembaixa: 'Quantidade baixa de pedidos na principal combinacao de cross-sell',
  combagemalta: 'Quantidade alta de pedidos na principal combinacao de cross-sell',
};

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatConfig(rows = []) {
  const byKey = new Map(rows.map((row) => [row.chave, row]));
  const config = { id: rows[0]?.id || null };

  Object.entries(DB_KEYS).forEach(([apiKey, dbKey]) => {
    config[apiKey] = toNumber(byKey.get(dbKey)?.valor, DEFAULT_CONFIG[apiKey]);
  });

  return config;
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

async function findAllConfigRows(transaction) {
  return db.KpiConfig.findAll({
    where: {
      chave: Object.values(DB_KEYS),
    },
    transaction,
  });
}

async function ensureConfigRows(transaction) {
  const rows = await findAllConfigRows(transaction);
  const existingKeys = new Set(rows.map((row) => row.chave));
  const now = new Date();

  const missingRows = Object.entries(DB_KEYS)
    .filter(([, dbKey]) => !existingKeys.has(dbKey))
    .map(([apiKey, dbKey]) => ({
      id: randomUUID(),
      chave: dbKey,
      valor: DEFAULT_CONFIG[apiKey],
      descricao: DESCRIPTIONS[apiKey],
      criado_em: now,
      atualizado_em: now,
    }));

  if (missingRows.length > 0) {
    await db.KpiConfig.bulkCreate(missingRows, {
      ignoreDuplicates: true,
      transaction,
    });
    return findAllConfigRows(transaction);
  }

  return rows;
}

exports.obterConfig = async () => {
  try {
    const rows = await ensureConfigRows();
    return formatConfig(rows);
  } catch (error) {
    console.error('[kpiConfigService] erro ao obter config:', error.message);
    return formatConfig([]);
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
    abandonobaixa: toNumber(body.abandonobaixa, current.abandonobaixa),
    abandonoalta: toNumber(body.abandonoalta, current.abandonoalta),
    cancelamentobaixa: toNumber(body.cancelamentobaixa, current.cancelamentobaixa),
    cancelamentoalta: toNumber(body.cancelamentoalta, current.cancelamentoalta),
    satisfacaobaixa: toNumber(body.satisfacaobaixa, current.satisfacaobaixa),
    satisfacaoalta: toNumber(body.satisfacaoalta, current.satisfacaoalta),
    combagembaixa: toNumber(body.combagembaixa, current.combagembaixa),
    combagemalta: toNumber(body.combagemalta, current.combagemalta),
  };

  validateRange(payload.faturamento_baixo, payload.faturamento_alto, 'faturamento_baixo', 'faturamento_alto');
  validateRange(payload.ticketbaixo, payload.ticketalto, 'ticketbaixo', 'ticketalto');
  validateRange(payload.recomprabaixa, payload.recompraalta, 'recomprabaixa', 'recompraalta');
  validateRange(payload.visitantebaixo, payload.visitantealto, 'visitantebaixo', 'visitantealto');
  validateRange(payload.conversaobaixa, payload.conversaoalta, 'conversaobaixa', 'conversaoalta');
  validateRange(payload.abandonobaixa, payload.abandonoalta, 'abandonobaixa', 'abandonoalta');
  validateRange(payload.cancelamentobaixa, payload.cancelamentoalta, 'cancelamentobaixa', 'cancelamentoalta');
  validateRange(payload.satisfacaobaixa, payload.satisfacaoalta, 'satisfacaobaixa', 'satisfacaoalta');
  validateRange(payload.combagembaixa, payload.combagemalta, 'combagembaixa', 'combagemalta');

  if (payload.abandonoalta > 100 || payload.cancelamentoalta > 100) {
    throw new AppError(400, 'As taxas devem estar entre 0 e 100');
  }

  if (payload.satisfacaoalta > 5) {
    throw new AppError(400, 'A satisfacao deve estar entre 0 e 5');
  }

  await db.sequelize.transaction(async (transaction) => {
    await ensureConfigRows(transaction);
    const now = new Date();

    for (const [apiKey, dbKey] of Object.entries(DB_KEYS)) {
      await db.KpiConfig.update(
        {
          valor: payload[apiKey],
          atualizado_em: now,
        },
        {
          where: { chave: dbKey },
          transaction,
        }
      );
    }
  });

  return exports.obterConfig();
};
