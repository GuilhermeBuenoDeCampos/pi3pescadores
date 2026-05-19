'use strict';

const asyncHandler = require('../utils/asyncHandler');
const pedidoService = require('../services/pedidoService');

exports.criar = asyncHandler(async (req, res) => {
  const pedido = await pedidoService.criarPedido(pedidoService.getUserId(req.user), req.body);

  console.info(`[pedido] criado ${pedido.numero_pedido} usuario=${pedido.id_usuario}`);

  res.status(201).json({
    data: pedido,
  });
});

exports.listarMeus = asyncHandler(async (req, res) => {
  console.log('[pedidoController] listarMeus chamado', {
    user: req.user ? { id: req.user.id, sub: req.user.sub } : 'undefined',
    query: req.query,
  });

  const result = await pedidoService.listarPedidosDoUsuario(pedidoService.getUserId(req.user), req.query);

  res.json(result);
});

exports.detalharMeu = asyncHandler(async (req, res) => {
  const pedido = await pedidoService.buscarPedidoDoUsuario(pedidoService.getUserId(req.user), req.params.id);

  res.json({
    data: pedido,
  });
});

exports.detalharAdmin = asyncHandler(async (req, res) => {
  const pedido = await pedidoService.buscarPedidoAdmin(req.params.id);

  res.json({
    data: pedido,
  });
});

exports.atualizarStatus = asyncHandler(async (req, res) => {
  const pedido = await pedidoService.atualizarStatusPedido(req.params.id, req.body.status);

  console.info(`[pedido] status ${pedido.numero_pedido} -> ${pedido.status}`);

  res.json({
    data: pedido,
  });
});
