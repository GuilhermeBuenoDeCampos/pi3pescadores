'use strict';

const repository = require('../repositories/carrinhoAbandonoRepository');
const dto = require('../dtos/carrinhoAbandonoDTO');

const ABANDONMENT_HOURS = 24;

async function obterDashboard(query = {}) {
  const range = dto.getRangeFromQuery(query);
  await repository.reconciliarCarrinhosConvertidos(range.start, range.end);
  const summary = await repository.getResumoPorPeriodo(range.start, range.end);
  return dto.toDashboardResponse(summary, range);
}

async function obterRelatorioMensal(query = {}) {
  const year = Number(query.year || query.ano) || new Date().getFullYear();
  await repository.reconciliarCarrinhosConvertidos(
    new Date(year, 0, 1),
    new Date(year, 11, 31, 23, 59, 59, 999)
  );
  const rows = await repository.getAbandonoMensal(year);
  return dto.toMonthlyResponse(rows);
}

async function processarCarrinhosAbandonados() {
  const limitDate = new Date(Date.now() - ABANDONMENT_HOURS * 60 * 60 * 1000);
  const updated = await repository.marcarCarrinhosAbandonados(limitDate);

  if (updated > 0) {
    console.info(`[carrinho-abandono] ${updated} carrinho(s) marcado(s) como abandonado(s).`);
  }

  return { updated, limitDate };
}

module.exports = {
  obterDashboard,
  obterRelatorioMensal,
  processarCarrinhosAbandonados,
};
