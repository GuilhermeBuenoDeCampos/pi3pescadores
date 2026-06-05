const { Router } = require('express');
const visitanteEventoService = require('../services/visitanteEventoService');
const asyncHandler = require('../utils/asyncHandler');
const authenticateOptional = require('../middlewares/authenticateOptional');

const router = Router();

/**
 * POST /api/visitante-evento
 * Registrar um evento de visitante
 */
router.post(
  '/',
  authenticateOptional,
  asyncHandler(async (req, res) => {
    const { evento } = req.body;
    const ip = req.clientIp;
    const dispositivo = req.clientUserAgent;
    const usuarioId = req.user?.sub || null;

    if (!evento) {
      console.warn('[visitante-evento POST] Evento vazio ou undefined');
      return res.status(400).json({ error: 'Evento é obrigatório' });
    }

    const novoEvento = await visitanteEventoService.registrarEvento(evento, ip, dispositivo, usuarioId);

    if (!novoEvento) {
      console.error('[visitante-evento POST] Falha ao registrar evento:', evento);
      return res.status(400).json({ error: 'Evento inválido ou erro ao registrar' });
    }

    res.status(201).json(novoEvento);
  })
);

/**
 * GET /api/visitante-evento/taxa-conversao
 * Obter taxa de conversão (visitantes vs pedidos confirmados)
 */
router.get(
  '/taxa-conversao',
  asyncHandler(async (req, res) => {
    const taxaConversao = await visitanteEventoService.obterTaxaConversao();
    res.json(taxaConversao);
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
