'use strict';

const { QueryTypes } = require('sequelize');
const db = require('../database/models');

const ACTIVE_STATUSES = ['active'];
const FINISHED_STATUSES = ['finalizado', 'FINALIZADO', 'completed', 'COMPLETED'];
const ABANDONED_STATUSES = ['abandonado', 'ABANDONADO'];
const COUNTED_STATUSES = [...ACTIVE_STATUSES, ...FINISHED_STATUSES, ...ABANDONED_STATUSES];

async function getResumoPorPeriodo(start, end) {
  const rows = await db.sequelize.query(
    `SELECT
      COUNT(*)::int AS "totalCarrinhos",
      COUNT(*) FILTER (WHERE status IN (:finishedStatuses))::int AS "carrinhosFinalizados",
      COUNT(*) FILTER (WHERE status IN (:abandonedStatuses))::int AS "carrinhosAbandonados"
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
    `WITH meses AS (
      SELECT generate_series(1, 12) AS month_number
    ),
    carrinhos_mes AS (
      SELECT
        EXTRACT(MONTH FROM criado_em)::int AS month_number,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status IN (:abandonedStatuses))::int AS abandonados
      FROM carrinhos
      WHERE criado_em >= :start
        AND criado_em <= :end
        AND status IN (:countedStatuses)
      GROUP BY month_number
    )
    SELECT
      meses.month_number,
      CASE meses.month_number
        WHEN 1 THEN 'Janeiro'
        WHEN 2 THEN 'Fevereiro'
        WHEN 3 THEN 'Março'
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
      COALESCE((carrinhos_mes.abandonados::numeric / NULLIF(carrinhos_mes.total, 0)) * 100, 0) AS taxa
    FROM meses
    LEFT JOIN carrinhos_mes ON carrinhos_mes.month_number = meses.month_number
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
  const [affectedRows] = await db.sequelize.query(
    `UPDATE carrinhos
    SET status = 'ABANDONADO',
        atualizado_em = CURRENT_TIMESTAMP
    WHERE status = 'active'
      AND ultima_interacao_em < :limitDate
    RETURNING id`,
    {
      type: QueryTypes.UPDATE,
      replacements: { limitDate },
    }
  );

  return Array.isArray(affectedRows) ? affectedRows.length : 0;
}

module.exports = {
  getResumoPorPeriodo,
  getAbandonoMensal,
  marcarCarrinhosAbandonados,
  FINISHED_STATUSES,
  ABANDONED_STATUSES,
};
