'use strict';

const db = require('../database/models');
const { QueryTypes } = require('sequelize');
const cache = require('../utils/cache');

const PAID_STATUSES = ['confirmado', 'preparando', 'enviado', 'concluido'];
const REDUCED_PERIODS = new Set(['day', 'week', 'month', 'year', 'custom']);
const MS_DAY = 24 * 60 * 60 * 1000;

function parseDate(value, fallback) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date;
}

function startOfDate(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDate(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function buildRangeFromQuery(query) {
  const period = String(query.period || 'month').toLowerCase();
  const now = new Date();

  switch (period) {
    case 'day': {
      const day = parseDate(query.date, now);
      const start = startOfDate(day);
      const end = endOfDate(day);
      return { start, end, label: 'dia', period: 'day' };
    }
    case 'week': {
      const baseDate = parseDate(query.date, now);
      const dayOfWeek = baseDate.getDay();
      const monday = new Date(baseDate.valueOf() - ((dayOfWeek + 6) % 7) * MS_DAY);
      const start = startOfDate(monday);
      const end = endOfDate(new Date(start.valueOf() + 6 * MS_DAY));
      return { start, end, label: 'semana', period: 'week' };
    }
    case 'year': {
      const year = Number(query.year) || now.getFullYear();
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      return { start, end, label: 'ano', period: 'year' };
    }
    case 'custom': {
      const start = startOfDate(parseDate(query.start, now));
      const end = endOfDate(parseDate(query.end, now));
      if (end < start) {
        throw new Error('Período personalizado inválido. A data final deve ser igual ou posterior à data inicial.');
      }
      return { start, end, label: 'personalizado', period: 'custom' };
    }
    case 'month':
    default: {
      const year = Number(query.year) || now.getFullYear();
      const month = Number(query.month) || now.getMonth() + 1;
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      return { start, end, label: 'mês', period: 'month' };
    }
  }
}

function buildPreviousRange(currentRange) {
  const { start, end, period } = currentRange;

  switch (period) {
    case 'day': {
      return {
        start: new Date(start.valueOf() - MS_DAY),
        end: new Date(end.valueOf() - MS_DAY),
      };
    }
    case 'week': {
      return {
        start: new Date(start.valueOf() - 7 * MS_DAY),
        end: new Date(end.valueOf() - 7 * MS_DAY),
      };
    }
    case 'month': {
      const prevMonthEnd = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59, 999);
      const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1);
      return { start: prevMonthStart, end: prevMonthEnd };
    }
    case 'year': {
      const year = start.getFullYear() - 1;
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
      };
    }
    case 'custom': {
      const diff = end.valueOf() - start.valueOf();
      return {
        start: new Date(start.valueOf() - diff - MS_DAY),
        end: new Date(end.valueOf() - diff - MS_DAY),
      };
    }
    default:
      return buildPreviousRange({ ...currentRange, period: 'month' });
  }
}

function getCacheKey(namespace, query) {
  const period = String(query.period || 'month').toLowerCase();
  const year = query.year || '';
  const month = query.month || '';
  const start = query.start || '';
  const end = query.end || '';
  const date = query.date || '';
  return `${namespace}:${period}:${year}:${month}:${date}:${start}:${end}`;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function percentChange(current, previous) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Number(((current - previous) / Math.abs(previous)) * 100);
}

function normalizeNumber(value) {
  return Number.isFinite(value) ? Number(value) : 0;
}

async function querySummary(start, end) {
  const result = await db.sequelize.query(
    `SELECT
      COUNT(*) AS pedidos_totais,
      COUNT(*) FILTER (WHERE status IN (:paidStatuses)) AS pedidos_pagos,
      COUNT(*) FILTER (WHERE status = 'pendente') AS pedidos_pendentes,
      COUNT(*) FILTER (WHERE status = 'cancelado') AS pedidos_cancelados,
      COALESCE(SUM(subtotal) FILTER (WHERE status IN (:paidStatuses)), 0) AS faturamento_total,
      COALESCE(SUM(subtotal) FILTER (WHERE status IN (:paidStatuses)) / NULLIF(COUNT(*) FILTER (WHERE status IN (:paidStatuses)), 0), 0) AS ticket_medio
    FROM pedidos
    WHERE criado_em BETWEEN :start AND :end`,
    {
      type: QueryTypes.SELECT,
      replacements: { start, end, paidStatuses: PAID_STATUSES },
    }
  );

  return result[0] || {};
}

async function queryRevenueDaily(start, end) {
  const rows = await db.sequelize.query(
    `SELECT
      DATE_TRUNC('day', criado_em)::date AS dia,
      COALESCE(SUM(subtotal), 0)::numeric(12,2) AS total
    FROM pedidos
    WHERE status IN (:paidStatuses)
      AND criado_em BETWEEN :start AND :end
    GROUP BY dia
    ORDER BY dia ASC`,
    {
      type: QueryTypes.SELECT,
      replacements: { start, end, paidStatuses: PAID_STATUSES },
    }
  );

  const days = [];
  const current = new Date(start);
  const final = new Date(end);

  while (current <= final) {
    const isoDay = current.toISOString().slice(0, 10);
    const row = rows.find((item) => item.dia === isoDay || item.dia === `${isoDay}`);
    days.push({
      date: isoDay,
      total: Number(row?.total || 0),
    });
    current.setDate(current.getDate() + 1);
  }

  return days;
}

async function queryTopProducts(start, end, limit = 8) {
  const rows = await db.sequelize.query(
    `SELECT
      pi.id_produto AS id_produto,
      pi.nome_produto AS nome,
      SUM(pi.quantidade)::int AS unidades_vendidas,
      COALESCE(SUM(pi.subtotal), 0)::numeric(12,2) AS receita
    FROM pedido_itens pi
    JOIN pedidos p ON p.id = pi.id_pedido
    WHERE p.status IN (:paidStatuses)
      AND p.criado_em BETWEEN :start AND :end
    GROUP BY pi.id_produto, pi.nome_produto
    ORDER BY unidades_vendidas DESC, receita DESC
    LIMIT :limit`,
    {
      type: QueryTypes.SELECT,
      replacements: { start, end, paidStatuses: PAID_STATUSES, limit },
    }
  );

  return rows.map((row) => ({
    id: row.id_produto,
    nome: row.nome,
    unidades_vendidas: Number(row.unidades_vendidas || 0),
    receita: Number(row.receita || 0),
  }));
}

async function queryCategoryRevenue(start, end, limit = 8) {
  const rows = await db.sequelize.query(
    `SELECT
      c.id AS id_categoria,
      c.nome AS categoria,
      COALESCE(SUM(pi.subtotal), 0)::numeric(12,2) AS faturamento,
      COALESCE(SUM(pi.quantidade), 0)::int AS unidades_vendidas
    FROM pedido_itens pi
    JOIN produto prod ON prod.id = pi.id_produto
    JOIN categoria c ON c.id = prod.id_categoria
    JOIN pedidos p ON p.id = pi.id_pedido
    WHERE p.status IN (:paidStatuses)
      AND p.criado_em BETWEEN :start AND :end
    GROUP BY c.id, c.nome
    ORDER BY faturamento DESC
    LIMIT :limit`,
    {
      type: QueryTypes.SELECT,
      replacements: { start, end, paidStatuses: PAID_STATUSES, limit },
    }
  );

  return rows.map((row) => ({
    id_categoria: row.id_categoria,
    categoria: row.categoria,
    faturamento: Number(row.faturamento || 0),
    unidades_vendidas: Number(row.unidades_vendidas || 0),
  }));
}

async function queryPayments(start, end) {
  const rows = await db.sequelize.query(
    `SELECT
      COALESCE(metodo_pagamento, 'outro') AS metodo_pagamento,
      COUNT(*)::int AS pedidos,
      COALESCE(SUM(subtotal), 0)::numeric(12,2) AS faturamento
    FROM pedidos
    WHERE status IN (:paidStatuses)
      AND criado_em BETWEEN :start AND :end
    GROUP BY metodo_pagamento
    ORDER BY pedidos DESC`,
    {
      type: QueryTypes.SELECT,
      replacements: { start, end, paidStatuses: PAID_STATUSES },
    }
  );

  return rows.map((row) => ({
    metodo_pagamento: row.metodo_pagamento,
    pedidos: Number(row.pedidos || 0),
    faturamento: Number(row.faturamento || 0),
  }));
}

async function queryCustomerRanking(start, end, limit = 5) {
  const rows = await db.sequelize.query(
    `SELECT
      u.id AS id_usuario,
      u.nome AS nome_cliente,
      COUNT(p.id)::int AS pedidos,
      COALESCE(SUM(p.total), 0)::numeric(12,2) AS faturamento
    FROM pedidos p
    JOIN usuarios u ON u.id = p.id_usuario
    WHERE p.status IN (:paidStatuses)
      AND p.criado_em BETWEEN :start AND :end
    GROUP BY u.id, u.nome
    ORDER BY faturamento DESC
    LIMIT :limit`,
    {
      type: QueryTypes.SELECT,
      replacements: { start, end, paidStatuses: PAID_STATUSES, limit },
    }
  );

  return rows.map((row) => ({
    id_usuario: row.id_usuario,
    nome_cliente: row.nome_cliente,
    pedidos: Number(row.pedidos || 0),
    faturamento: Number(row.faturamento || 0),
  }));
}

async function queryEstimatedProfit(start, end) {
  const rows = await db.sequelize.query(
    `SELECT
      COALESCE(SUM(pi.quantidade * (prod.preco_venda - prod.preco_custo)), 0)::numeric(12,2) AS lucro_estimado
    FROM pedido_itens pi
    JOIN produto prod ON prod.id = pi.id_produto
    JOIN pedidos p ON p.id = pi.id_pedido
    WHERE p.status IN (:paidStatuses)
      AND p.criado_em BETWEEN :start AND :end`,
    {
      type: QueryTypes.SELECT,
      replacements: { start, end, paidStatuses: PAID_STATUSES },
    }
  );
  return Number(rows[0]?.lucro_estimado || 0);
}

async function queryOrderStatusCounts(start, end) {
  const rows = await db.sequelize.query(
    `SELECT
      status,
      COUNT(*)::int AS total
    FROM pedidos
    WHERE criado_em BETWEEN :start AND :end
    GROUP BY status`,
    {
      type: QueryTypes.SELECT,
      replacements: { start, end },
    }
  );

  return rows.reduce((acc, row) => {
    acc[row.status] = Number(row.total || 0);
    return acc;
  }, {});
}

function formatCurrencyValue(value) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function buildProgressAlert(currentRevenue, previousRevenue, pendingCount, totalOrders) {
  const alerts = [];
  const revenueTrend = percentChange(currentRevenue, previousRevenue);

  if (revenueTrend < -10) {
    alerts.push({
      type: 'danger',
      message: 'Queda acentuada no faturamento em relação ao período anterior.',
    });
  } else if (revenueTrend < 0) {
    alerts.push({
      type: 'warning',
      message: 'Vendas abaixo do período anterior. Analise o funil de conversão.',
    });
  }

  const pendingRatio = totalOrders > 0 ? (pendingCount / totalOrders) * 100 : 0;
  if (pendingRatio >= 30) {
    alerts.push({
      type: 'warning',
      message: 'Mais de 30% dos pedidos estão pendentes. Verifique o atendimento e pagamentos.',
    });
  }

  return alerts;
}

async function buildFinanceiroResponse(query) {
  const currentRange = buildRangeFromQuery(query);
  const previousRange = buildPreviousRange(currentRange);
  const cacheKey = getCacheKey('dashboard:financeiro', query);
  const cachedValue = await cache.getCache(cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  const [currentSummary, previousSummary] = await Promise.all([
    querySummary(currentRange.start, currentRange.end),
    querySummary(previousRange.start, previousRange.end),
  ]);

  const [revenueDaily, productRanking, categoryRevenue, payments, customerRanking, estimatedProfit, orderStatuses] = await Promise.all([
    queryRevenueDaily(currentRange.start, currentRange.end),
    queryTopProducts(currentRange.start, currentRange.end),
    queryCategoryRevenue(currentRange.start, currentRange.end),
    queryPayments(currentRange.start, currentRange.end),
    queryCustomerRanking(currentRange.start, currentRange.end),
    queryEstimatedProfit(currentRange.start, currentRange.end),
    queryOrderStatusCounts(currentRange.start, currentRange.end),
  ]);

  const growth = percentChange(Number(currentSummary.faturamento_total), Number(previousSummary.faturamento_total));
  const metaMensal = Math.max(1, Number(previousSummary.faturamento_total) * 1.1, 50000);
  const totalOrders = Number(currentSummary.pedidos_totais || 0);

  const elapsedDays = Math.max(1, Math.ceil((Math.min(new Date(), currentRange.end) - currentRange.start + 1) / MS_DAY));
  const totalDays = Math.max(1, Math.ceil((currentRange.end - currentRange.start + 1) / MS_DAY));
  const averageDaily = Number(currentSummary.faturamento_total) / elapsedDays;
  const projected = averageDaily * totalDays;

  const data = {
    periodo: currentRange.label,
    inicio: currentRange.start.toISOString().slice(0, 10),
    fim: currentRange.end.toISOString().slice(0, 10),
    faturamento_total: formatCurrencyValue(currentSummary.faturamento_total),
    faturamento_anual: formatCurrencyValue(await calculateAnnualRevenue(currentRange.start, currentRange.end)),
    ticket_medio: formatCurrencyValue(currentSummary.ticket_medio),
    pedidos: {
      total: totalOrders,
      pagos: Number(currentSummary.pedidos_pagos || 0),
      pendentes: Number(currentSummary.pedidos_pendentes || 0),
      cancelados: Number(currentSummary.pedidos_cancelados || 0),
    },
    crescimento_percentual: Number(growth.toFixed(2)),
    lucro_estimado: Number(estimatedProfit.toFixed(2)),
    produtos_mais_vendidos: productRanking,
    categorias_mais_lucrativas: categoryRevenue,
    formas_pagamento: payments,
    ranking_clientes: customerRanking,
    comparacao_periodo_anterior: {
      faturamento: formatCurrencyValue(previousSummary.faturamento_total),
      pedidos: Number(previousSummary.pedidos_pagos || 0),
      crescimento_percentual: Number(growth.toFixed(2)),
    },
    previsao_faturamento: Number(projected.toFixed(2)),
    meta_financeira: Number(metaMensal.toFixed(2)),
    alertas: buildProgressAlert(Number(currentSummary.faturamento_total), Number(previousSummary.faturamento_total), Number(currentSummary.pedidos_pendentes || 0), totalOrders),
    vendas_por_status: {
      pendente: Number(orderStatuses.pendente || 0),
      confirmado: Number(orderStatuses.confirmado || 0),
      preparando: Number(orderStatuses.preparando || 0),
      enviado: Number(orderStatuses.enviado || 0),
      concluido: Number(orderStatuses.concluido || 0),
      cancelado: Number(orderStatuses.cancelado || 0),
    },
    indicador_crescimento_diario: Number(averageDaily.toFixed(2)),
    periodo_anterior: {
      inicio: previousRange.start.toISOString().slice(0, 10),
      fim: previousRange.end.toISOString().slice(0, 10),
    },
  };

  await cache.setCache(cacheKey, data, 60);
  return data;
}

async function calculateAnnualRevenue(start, end) {
  const yearStart = new Date(start.getFullYear(), 0, 1);
  const yearEnd = end;

  const result = await db.sequelize.query(
    `SELECT COALESCE(SUM(subtotal), 0)::numeric(14,2) AS faturamento_anual
     FROM pedidos
     WHERE status IN (:paidStatuses)
       AND criado_em BETWEEN :yearStart AND :yearEnd`,
    {
      type: QueryTypes.SELECT,
      replacements: { paidStatuses: PAID_STATUSES, yearStart, yearEnd },
    }
  );

  return Number(result[0]?.faturamento_anual || 0);
}

async function buildFaturamentoMensal(query) {
  const currentRange = buildRangeFromQuery(query);
  const previousRange = buildPreviousRange(currentRange);
  const cacheKey = getCacheKey('dashboard:faturamento-mensal', query);
  const cachedValue = await cache.getCache(cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  const [series, previousSummary] = await Promise.all([
    queryRevenueDaily(currentRange.start, currentRange.end),
    querySummary(previousRange.start, previousRange.end),
  ]);

  const total = series.reduce((sum, day) => sum + day.total, 0);
  const previousTotal = Number(previousSummary.faturamento_total || 0);
  const growth = percentChange(total, previousTotal);

  const response = {
    periodo: currentRange.label,
    inicio: currentRange.start.toISOString().slice(0, 10),
    fim: currentRange.end.toISOString().slice(0, 10),
    faturamento_diarriere: series,
    faturamento_total: Number(total.toFixed(2)),
    comparacao_periodo_anterior: {
      faturamento: previousTotal,
      crescimento_percentual: Number(growth.toFixed(2)),
    },
  };

  await cache.setCache(cacheKey, response, 60);
  return response;
}

async function buildProdutosMaisVendidos(query) {
  const currentRange = buildRangeFromQuery(query);
  const cacheKey = getCacheKey('dashboard:produtos-mais-vendidos', query);
  const cachedValue = await cache.getCache(cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  const rows = await queryTopProducts(currentRange.start, currentRange.end, 12);
  await cache.setCache(cacheKey, rows, 60);
  return rows;
}

async function buildCategorias(query) {
  const currentRange = buildRangeFromQuery(query);
  const cacheKey = getCacheKey('dashboard:categorias', query);
  const cachedValue = await cache.getCache(cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  const rows = await queryCategoryRevenue(currentRange.start, currentRange.end, 12);
  await cache.setCache(cacheKey, rows, 60);
  return rows;
}

async function buildVendasPorPeriodo(query) {
  const currentRange = buildRangeFromQuery(query);
  const cacheKey = getCacheKey('dashboard:vendas-por-periodo', query);
  const cachedValue = await cache.getCache(cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  const payments = await queryPayments(currentRange.start, currentRange.end);
  const statuses = await queryOrderStatusCounts(currentRange.start, currentRange.end);

  const response = {
    periodo: currentRange.label,
    inicio: currentRange.start.toISOString().slice(0, 10),
    fim: currentRange.end.toISOString().slice(0, 10),
    formas_pagamento: payments,
    status: {
      pendente: Number(statuses.pendente || 0),
      confirmado: Number(statuses.confirmado || 0),
      preparando: Number(statuses.preparando || 0),
      enviado: Number(statuses.enviado || 0),
      concluido: Number(statuses.concluido || 0),
      cancelado: Number(statuses.cancelado || 0),
    },
  };

  await cache.setCache(cacheKey, response, 60);
  return response;
}

module.exports = {
  getFinanceiro: async (query = {}) => buildFinanceiroResponse(query),
  getFaturamentoMensal: async (query = {}) => buildFaturamentoMensal(query),
  getProdutosMaisVendidos: async (query = {}) => buildProdutosMaisVendidos(query),
  getCategorias: async (query = {}) => buildCategorias(query),
  getVendasPorPeriodo: async (query = {}) => buildVendasPorPeriodo(query),
};
