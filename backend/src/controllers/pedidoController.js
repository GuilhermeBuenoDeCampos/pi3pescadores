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

exports.listarTodos = asyncHandler(async (req, res) => {
  console.log('[pedidoController] listarTodos chamado', {
    query: req.query,
  });

  const result = await pedidoService.listarTodosPedidos(req.query);

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

exports.faturamentoMensal = asyncHandler(async (req, res) => {
  const meses = Math.min(Math.max(Number(req.query.meses) || 12, 1), 60);
  const faturamento = await pedidoService.obterFaturamentoMensal(meses);

  res.json({
    data: faturamento,
    periodo_meses: meses,
  });
});

exports.ticketMedio = asyncHandler(async (req, res) => {
  const ticketMedio = await pedidoService.obterTicketMedio();

  res.json({
    data: ticketMedio,
  });
});

