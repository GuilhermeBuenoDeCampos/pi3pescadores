'use strict';

const AppError = require('../middlewares/appError');

const MS_DAY = 24 * 60 * 60 * 1000;

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, 'Data invalida. Use o formato YYYY-MM-DD.');
  }

  return date;
}

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function getRangeFromQuery(query = {}) {
  const now = new Date();
  const dataInicio = parseDate(query.dataInicio || query.start);
  const dataFim = parseDate(query.dataFim || query.end);

  if (dataInicio || dataFim) {
    const start = startOfDay(dataInicio || dataFim);
    const end = endOfDay(dataFim || dataInicio);

    if (end < start) {
      throw new AppError(400, 'dataFim deve ser igual ou posterior a dataInicio.');
    }

    return { start, end, label: 'personalizado' };
  }

  const period = String(query.period || query.periodo || '30d').toLowerCase();

  if (period === 'hoje' || period === 'today' || period === 'day') {
    return { start: startOfDay(now), end: endOfDay(now), label: 'hoje' };
  }

  if (period === '7d' || period === 'week' || period === 'ultimos7dias') {
    return {
      start: startOfDay(new Date(now.valueOf() - 6 * MS_DAY)),
      end: endOfDay(now),
      label: 'ultimos_7_dias',
    };
  }

  return {
    start: startOfDay(new Date(now.valueOf() - 29 * MS_DAY)),
    end: endOfDay(now),
    label: 'ultimos_30_dias',
  };
}

function toDashboardResponse(summary, range) {
  const totalCarrinhos = Number(summary.totalCarrinhos || 0);
  const carrinhosFinalizados = Number(summary.carrinhosFinalizados || 0);
  const carrinhosAbandonados = Number(summary.carrinhosAbandonados || 0);
  const taxaAbandono = totalCarrinhos > 0 ? (carrinhosAbandonados / totalCarrinhos) * 100 : 0;

  return {
    totalCarrinhos,
    carrinhosFinalizados,
    carrinhosAbandonados,
    taxaAbandono: Number(taxaAbandono.toFixed(1)),
    periodo: {
      tipo: range.label,
      dataInicio: range.start.toISOString().slice(0, 10),
      dataFim: range.end.toISOString().slice(0, 10),
    },
  };
}

function toMonthlyResponse(rows) {
  return rows.map((row) => ({
    mes: row.mes,
    taxa: Number(Number(row.taxa || 0).toFixed(1)),
  }));
}

module.exports = {
  getRangeFromQuery,
  toDashboardResponse,
  toMonthlyResponse,
};
