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
  const db = require('../database/config');
  const { Op } = require('sequelize');

  console.log('[debugPedidos] Iniciando debug...');

  // Contar pedidos por status
  const pedidosPorStatus = await db.Pedido.findAll({
    attributes: ['status', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total']],
    group: ['status'],
    raw: true,
  });

  console.log('[debugPedidos] Pedidos por status:', pedidosPorStatus);

  // Buscar todos os pedidos com status válidos
  const statusValidos = ['preparando', 'enviado', 'confirmado', 'concluido'];
  const pedidosValidos = await db.Pedido.findAll({
    where: {
      status: {
        [Op.in]: statusValidos,
      },
    },
    attributes: ['id', 'numero_pedido', 'total', 'status', 'criado_em'],
    order: [['criado_em', 'DESC']],
    limit: 10,
    raw: true,
  });

  console.log('[debugPedidos] Últimos 10 pedidos com status válidos:', pedidosValidos);

  // Contar total de pedidos
  const totalPedidos = await db.Pedido.count();
  const totalValidos = await db.Pedido.count({
    where: {
      status: {
        [Op.in]: statusValidos,
      },
    },
  });

  res.json({
    debug: {
      totalPedidos,
      totalComStatusValido: totalValidos,
      pedidosPorStatus,
      amostraUltimos10: pedidosValidos,
    },
  });
});

