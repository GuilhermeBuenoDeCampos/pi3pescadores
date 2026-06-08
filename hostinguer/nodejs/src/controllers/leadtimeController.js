'use strict';

const asyncHandler = require('../utils/asyncHandler');
const leadtimeService = require('../services/leadtimeService');

exports.obterMediaLeadtime = asyncHandler(async (req, res) => {
  const mediaLeadtime = await leadtimeService.calcularMediaLeadtime();
  res.json({ data: mediaLeadtime });
});

exports.obterLeadtimePorPeriodo = asyncHandler(async (req, res) => {
  const { mes = 1 } = req.query;
  const leadtimes = await leadtimeService.obterLeadtimePorPeriodo(parseInt(mes, 10));
  res.json({ data: leadtimes });
});

exports.registrarEventoLeadtime = asyncHandler(async (req, res) => {
  const { pedido_id, usuarios_id, stage } = req.body;

  if (!pedido_id || !stage) {
    return res.status(400).json({
      error: {
        message: 'pedido_id e stage sao obrigatorios',
      },
    });
  }

  const leadtime = await leadtimeService.registrarEventoLeadtime(pedido_id, usuarios_id, stage);
  res.json({ data: leadtime });
});
