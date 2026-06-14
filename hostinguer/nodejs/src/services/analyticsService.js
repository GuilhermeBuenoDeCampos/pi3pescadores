'use strict';

const { Op, fn, col, literal } = require('sequelize');
const db = require('../database/models');

exports.registrarEventos = async (eventos, usuarioId = null) => {
  if (!eventos || eventos.length === 0) return [];

  const now = new Date();
  const registros = eventos.map((e) => ({
    sessao_id: e.sessao_id,
    tipo: e.tipo,
    pagina: e.pagina,
    elemento: e.elemento || null,
    coordenada_x: e.coordenada_x != null ? e.coordenada_x : null,
    coordenada_y: e.coordenada_y != null ? e.coordenada_y : null,
    duracao_ms: e.duracao_ms != null ? e.duracao_ms : null,
    largura_tela: e.largura_tela || null,
    altura_tela: e.altura_tela || null,
    origem: e.origem || null,
    usuario_id: usuarioId,
    criado_em: now,
  }));

  return db.AnalyticsComportamento.bulkCreate(registros);
};

exports.obterTempoPorPagina = async (dias = 30) => {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - dias);

  const registros = await db.AnalyticsComportamento.findAll({
    attributes: [
      'pagina',
      [fn('AVG', col('duracao_ms')), 'tempo_medio_ms'],
      [fn('COUNT', col('id')), 'total_visualizacoes'],
      [fn('MAX', col('created_at')), 'ultima_visualizacao'],
    ],
    where: {
      tipo: 'page_view',
      criado_em: { [Op.gte]: dataLimite },
      duracao_ms: { [Op.ne]: null },
    },
    group: ['pagina'],
    order: [[fn('COUNT', col('id')), 'DESC']],
    raw: true,
  });

  return registros.map((r) => ({
    pagina: r.pagina,
    tempo_medio_segundos: Math.round(Number(r.tempo_medio_ms) / 1000),
    total_visualizacoes: Number(r.total_visualizacoes),
    ultima_visualizacao: r.ultima_visualizacao,
  }));
};

exports.obterTempoPorPaginaResumido = async (dias = 30) => {
  const data = await exports.obterTempoPorPagina(dias);
  const totalVisualizacoes = data.reduce((s, r) => s + r.total_visualizacoes, 0);
  const totalTempo = data.reduce((s, r) => s + r.tempo_medio_segundos * r.total_visualizacoes, 0);
  const mediaGlobal = totalVisualizacoes > 0 ? Math.round(totalTempo / totalVisualizacoes) : 0;

  return {
    media_global_segundos: mediaGlobal,
    total_visualizacoes: totalVisualizacoes,
    paginas: data.slice(0, 10),
  };
};

exports.obterDadosHeatmap = async (pagina = null, dias = 30) => {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - dias);

  const where = {
    [Op.or]: [{ tipo: 'click' }, { tipo: 'hover' }],
    criado_em: { [Op.gte]: dataLimite },
    coordenada_x: { [Op.ne]: null },
    coordenada_y: { [Op.ne]: null },
  };

  if (pagina) {
    where.pagina = pagina;
  }

  const registros = await db.AnalyticsComportamento.findAll({
    attributes: [
      'tipo',
      'pagina',
      'coordenada_x',
      'coordenada_y',
      'largura_tela',
      'altura_tela',
      'elemento',
      [fn('COUNT', col('id')), 'total'],
    ],
    where,
    group: ['tipo', 'pagina', 'coordenada_x', 'coordenada_y', 'largura_tela', 'altura_tela', 'elemento'],
    order: [[fn('COUNT', col('id')), 'DESC']],
    limit: 500,
    raw: true,
  });

  return registros.map((r) => ({
    tipo: r.tipo,
    pagina: r.pagina,
    coordenada_x: Number(r.coordenada_x),
    coordenada_y: Number(r.coordenada_y),
    largura_tela: r.largura_tela ? Number(r.largura_tela) : null,
    altura_tela: r.altura_tela ? Number(r.altura_tela) : null,
    elemento: r.elemento,
    total: Number(r.total),
  }));
};

exports.obterPaginasComMaisCliques = async (dias = 30) => {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - dias);

  const registros = await db.AnalyticsComportamento.findAll({
    attributes: [
      'pagina',
      [fn('COUNT', col('id')), 'total_interacoes'],
    ],
    where: {
      [Op.or]: [{ tipo: 'click' }, { tipo: 'hover' }],
      criado_em: { [Op.gte]: dataLimite },
    },
    group: ['pagina'],
    order: [[fn('COUNT', col('id')), 'DESC']],
    limit: 10,
    raw: true,
  });

  return registros.map((r) => ({
    pagina: r.pagina,
    total_interacoes: Number(r.total_interacoes),
  }));
};

exports.obterUsuariosPorMes = async (dias = 90) => {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - dias);
  const dialect = db.sequelize.getDialect();
  const monthExpression = dialect === 'mysql' || dialect === 'mariadb'
    ? "DATE_FORMAT(ac.created_at, '%Y-%m-01')"
    : "DATE_TRUNC('month', ac.created_at)";

  let registros;
  try {
    registros = await db.sequelize.query(
      `SELECT
        ${monthExpression} AS mes,
        ac.usuario_id,
        u.nome,
        u.email,
        COUNT(*) AS total_eventos,
        MAX(ac.created_at) AS ultimo_acesso
      FROM analytics_comportamento ac
      LEFT JOIN usuarios u ON u.id = ac.usuario_id
      WHERE ac.created_at >= :dataLimite
        AND ac.usuario_id IS NOT NULL
      GROUP BY ${monthExpression}, ac.usuario_id, u.nome, u.email
      ORDER BY mes DESC, ultimo_acesso DESC`,
      {
        replacements: { dataLimite },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );
  } catch (err) {
    console.error('[AnalyticsService] obterUsuariosPorMes error:', err.message);
    return [];
  }

  const meses = {};
  for (const r of registros) {
    let chave;
    if (typeof r.mes === 'string') {
      chave = r.mes.slice(0, 7);
    } else if (r.mes instanceof Date) {
      chave = r.mes.toISOString().slice(0, 7);
    } else {
      chave = new Date(r.mes).toISOString().slice(0, 7);
    }
    if (!meses[chave]) meses[chave] = [];
    meses[chave].push({
      usuario_id: r.usuario_id,
      nome: r.nome || '—',
      email: r.email || '—',
      total_eventos: Number(r.total_eventos),
      ultimo_acesso: r.ultimo_acesso,
    });
  }

  return Object.entries(meses)
    .map(([mes, usuarios]) => ({ mes, usuarios }))
    .sort((a, b) => b.mes.localeCompare(a.mes));
};

exports.obterEstatisticasComportamento = async (dias = 30) => {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - dias);

  const [totalPageViews, totalClicks, totalHovers, sessoes] = await Promise.all([
    db.AnalyticsComportamento.count({
      where: { tipo: 'page_view', criado_em: { [Op.gte]: dataLimite } },
    }),
    db.AnalyticsComportamento.count({
      where: { tipo: 'click', criado_em: { [Op.gte]: dataLimite } },
    }),
    db.AnalyticsComportamento.count({
      where: { tipo: 'hover', criado_em: { [Op.gte]: dataLimite } },
    }),
    db.AnalyticsComportamento.count({
      distinct: true,
      col: 'sessao_id',
      where: { criado_em: { [Op.gte]: dataLimite } },
    }),
  ]);

  const mediaTempo = await db.AnalyticsComportamento.findAll({
    attributes: [[fn('AVG', col('duracao_ms')), 'media_ms']],
    where: {
      tipo: 'page_view',
      duracao_ms: { [Op.ne]: null },
      criado_em: { [Op.gte]: dataLimite },
    },
    raw: true,
  });

  return {
    total_page_views: totalPageViews,
    total_clicks: totalClicks,
    total_hovers: totalHovers,
    sessoes_unicas: sessoes,
    tempo_medio_por_pagina_segundos: mediaTempo[0]?.media_ms
      ? Math.round(Number(mediaTempo[0].media_ms) / 1000)
      : 0,
  };
};
