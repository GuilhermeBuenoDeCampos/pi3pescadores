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
  
  console.log('[pedidoController] faturamentoMensal chamado com meses:', meses);
  
  const faturamento = await pedidoService.obterFaturamentoMensal(meses);

  console.log('[pedidoController] faturamento recebido:', {
    totalItens: faturamento.length,
    faturamento: faturamento.slice(0, 3),
  });

  res.json({
    data: faturamento,
    periodo_meses: meses,
  });
});

exports.debugPedidos = asyncHandler(async (req, res) => {
  const db = require('../database/models');
  const { Op } = require('sequelize');

  console.log('[debugPedidos] Iniciando debug...');

  // Buscar todos os pedidos
  const todosOsPedidos = await db.Pedido.findAll({
    attributes: ['id', 'numero_pedido', 'total', 'status', 'criado_em'],
    order: [['criado_em', 'DESC']],
    raw: true,
  });

  console.log('[debugPedidos] Total de pedidos encontrados:', todosOsPedidos.length);

  // Agrupar por status manualmente
  const pedidosPorStatus = {};
  todosOsPedidos.forEach(pedido => {
    if (!pedidosPorStatus[pedido.status]) {
      pedidosPorStatus[pedido.status] = 0;
    }
    pedidosPorStatus[pedido.status]++;
  });

  console.log('[debugPedidos] Pedidos por status:', pedidosPorStatus);

  // Buscar os últimos 10 pedidos
  const ultimos10 = todosOsPedidos.slice(0, 10);

  // Buscar pedidos com status válidos
  const statusValidos = ['preparando', 'enviado', 'confirmado', 'concluido'];
  const pedidosValidos = todosOsPedidos.filter(p => statusValidos.includes(p.status));

  console.log('[debugPedidos] Total de pedidos com status válido:', pedidosValidos.length);

  res.json({
    debug: {
      totalPedidos: todosOsPedidos.length,
      totalComStatusValido: pedidosValidos.length,
      pedidosPorStatus,
      ultimos10,
      statusValidos,
    },
  });
});

