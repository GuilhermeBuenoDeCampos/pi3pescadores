'use strict';

const asyncHandler = require('../utils/asyncHandler');
const analyticsService = require('../services/analyticsService');
const AppError = require('../middlewares/appError');

exports.registrarEventos = asyncHandler(async (req, res) => {
  const { eventos } = req.body;
  const usuarioId = req.user?.sub || null;

  if (!eventos || !Array.isArray(eventos) || eventos.length === 0) {
    throw new AppError(400, 'Lista de eventos é obrigatória');
  }

  if (eventos.length > 500) {
    throw new AppError(400, 'Máximo de 500 eventos por requisição');
  }

  const registrados = await analyticsService.registrarEventos(eventos, usuarioId);
  res.status(201).json({ data: { registrados: registrados.length } });
});

exports.obterTempoPorPagina = asyncHandler(async (req, res) => {
  const { dias = 30 } = req.query;
  const data = await analyticsService.obterTempoPorPaginaResumido(Number(dias));
  res.json({ data });
});

exports.obterHeatmap = asyncHandler(async (req, res) => {
  const { pagina, dias = 30 } = req.query;
  const data = await analyticsService.obterDadosHeatmap(pagina || null, Number(dias));
  res.json({ data });
});

exports.obterPaginasComMaisCliques = asyncHandler(async (req, res) => {
  const { dias = 30 } = req.query;
  const data = await analyticsService.obterPaginasComMaisCliques(Number(dias));
  res.json({ data });
});

exports.listarUsuariosPorMes = asyncHandler(async (req, res) => {
  const { dias = 90 } = req.query;
  const data = await analyticsService.obterUsuariosPorMes(Number(dias));
  res.json({ data });
});

exports.obterEstatisticas = asyncHandler(async (req, res) => {
  const { dias = 30 } = req.query;
  const data = await analyticsService.obterEstatisticasComportamento(Number(dias));
  res.json({ data });
});
