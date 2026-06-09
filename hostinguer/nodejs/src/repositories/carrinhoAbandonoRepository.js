'use strict';

const { QueryTypes } = require('sequelize');
const db = require('../database/models');

const ACTIVE_STATUSES = ['ativo', 'active'];
const FINISHED_STATUSES = ['finalizado', 'FINALIZADO', 'completed', 'COMPLETED'];
const ABANDONED_STATUSES = ['abandonado', 'ABANDONADO'];
const COUNTED_STATUSES = [...ACTIVE_STATUSES, ...FINISHED_STATUSES, ...ABANDONED_STATUSES];

async function getResumoPorPeriodo(start, end) {
  const rows = await db.sequelize.query(
    `SELECT
      COUNT(*) AS totalCarrinhos,
      SUM(CASE WHEN status IN (:finishedStatuses) THEN 1 ELSE 0 END) AS carrinhosFinalizados,
      SUM(CASE WHEN status IN (:abandonedStatuses) THEN 1 ELSE 0 END) AS carrinhosAbandonados
    FROM carrinhos
    WHERE criado_em BETWEEN :start AND :end
      AND status IN (:countedStatuses)`,
    {
      type: QueryTypes.SELECT,
      replacements: {
        start,
        end,
        finishedStatuses: FINISHED_STATUSES,
        abandonedStatuses: ABANDONED_STATUSES,
        countedStatuses: COUNTED_STATUSES,
      },
    }
  );

  return rows[0] || {};
}

async function getAbandonoMensal(year) {
  const rows = await db.sequelize.query(
    `SELECT
      meses.month_number,
      CASE meses.month_number
        WHEN 1 THEN 'Janeiro'
        WHEN 2 THEN 'Fevereiro'
        WHEN 3 THEN 'Marco'
        WHEN 4 THEN 'Abril'
        WHEN 5 THEN 'Maio'
        WHEN 6 THEN 'Junho'
        WHEN 7 THEN 'Julho'
        WHEN 8 THEN 'Agosto'
        WHEN 9 THEN 'Setembro'
        WHEN 10 THEN 'Outubro'
        WHEN 11 THEN 'Novembro'
        ELSE 'Dezembro'
      END AS mes,
      COALESCE((carrinhos_mes.abandonados / NULLIF(carrinhos_mes.total, 0)) * 100, 0) AS taxa
    FROM (
      SELECT 1 AS month_number UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8
      UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
    ) meses
    LEFT JOIN (
      SELECT
        MONTH(criado_em) AS month_number,
        COUNT(*) AS total,
        SUM(CASE WHEN status IN (:abandonedStatuses) THEN 1 ELSE 0 END) AS abandonados
      FROM carrinhos
      WHERE criado_em >= :start
        AND criado_em <= :end
        AND status IN (:countedStatuses)
      GROUP BY MONTH(criado_em)
    ) carrinhos_mes ON carrinhos_mes.month_number = meses.month_number
    ORDER BY meses.month_number ASC`,
    {
      type: QueryTypes.SELECT,
      replacements: {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
        abandonedStatuses: ABANDONED_STATUSES,
        countedStatuses: COUNTED_STATUSES,
      },
    }
  );

  return rows;
}

async function marcarCarrinhosAbandonados(limitDate) {
  const [_, metadata] = await db.sequelize.query(
    `UPDATE carrinhos
    SET status = 'abandonado',
        atualizado_em = CURRENT_TIMESTAMP
    WHERE status IN (:activeStatuses)
      AND ultima_interacao_em < :limitDate`,
    {
      type: QueryTypes.UPDATE,
      replacements: {
        activeStatuses: ACTIVE_STATUSES,
        limitDate,
      },
    }
  );

  return Number(metadata?.affectedRows || metadata || 0);
}

module.exports = {
  getResumoPorPeriodo,
  getAbandonoMensal,
  marcarCarrinhosAbandonados,
  FINISHED_STATUSES,
  ABANDONED_STATUSES,
};
