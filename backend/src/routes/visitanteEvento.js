const { Router } = require('express');
const visitanteEventoService = require('../services/visitanteEventoService');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

/**
 * POST /api/visitante-evento
 * Registrar um evento de visitante
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { evento } = req.body;
    const ip = req.clientIp;
    const dispositivo = req.clientUserAgent;

    const novoEvento = await visitanteEventoService.registrarEvento(evento, ip, dispositivo);

    if (!novoEvento) {
      return res.status(400).json({ error: 'Evento inválido ou erro ao registrar' });
    }

    res.status(201).json(novoEvento);
  })
);

/**
 * GET /api/visitante-evento/stats
 * Obter estatísticas de eventos
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await visitanteEventoService.obterEstatisticas();
    res.json(stats);
  })
);

/**
 * GET /api/visitante-evento/recentes
 * Obter eventos recentes
 */
router.get(
  '/recentes',
  asyncHandler(async (req, res) => {
    const { dias = 7 } = req.query;
    const eventos = await visitanteEventoService.obterEventosRecentes(parseInt(dias, 10));
    res.json(eventos);
  })
);

module.exports = router;
