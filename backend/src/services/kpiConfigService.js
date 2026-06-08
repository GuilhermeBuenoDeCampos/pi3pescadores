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
};

const DESCRIPTIONS = {
  faturamento_baixo: 'Limite baixo de faturamento',
  faturamento_alto: 'Limite alto de faturamento',
  ticketbaixo: 'Ticket mínimo',
  ticketalto: 'Ticket máximo',
  recomprabaixa: 'Taxa de recompra baixa',
  recompraalta: 'Taxa de recompra alta',
  visitantebaixo: 'Visitantes mínimo',
  visitantealto: 'Visitantes máximo',
  conversaobaixa: 'Taxa de conversão baixa %',
  conversaoalta: 'Taxa de conversão alta %',
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
    throw new AppError(400, `${lowName} deve ser um número positivo`);
  }

  if (!Number.isFinite(high) || high < 0) {
    throw new AppError(400, `${highName} deve ser um número positivo`);
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
    await db.KpiConfig.bulkCreate(missingRows, { transaction });
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
  };

  validateRange(payload.faturamento_baixo, payload.faturamento_alto, 'faturamento_baixo', 'faturamento_alto');
  validateRange(payload.ticketbaixo, payload.ticketalto, 'ticketbaixo', 'ticketalto');
  validateRange(payload.recomprabaixa, payload.recompraalta, 'recomprabaixa', 'recompraalta');
  validateRange(payload.visitantebaixo, payload.visitantealto, 'visitantebaixo', 'visitantealto');
  validateRange(payload.conversaobaixa, payload.conversaoalta, 'conversaobaixa', 'conversaoalta');

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
