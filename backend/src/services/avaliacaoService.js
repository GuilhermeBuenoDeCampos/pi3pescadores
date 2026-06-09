'use strict';

const db = require('../database/models');
const AppError = require('../middlewares/appError');

function getUserId(user) {
  return user?.sub || user?.id || null;
}

function toInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeScore(value, fallback) {
  const parsed = toInteger(value);

  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 5) {
    return parsed;
  }

  return fallback;
}

function toAvaliacaoPayload(avaliacao) {
  const plain = avaliacao.toJSON ? avaliacao.toJSON() : avaliacao;

  return {
    id: plain.id,
    pedido_id: plain.pedido_id,
    usuario_id: plain.usuario_id,
    nota: Number(plain.nota),
    atendimento: Number(plain.atendimento),
    entrega: Number(plain.entrega),
    qualidade: Number(plain.qualidade),
    preco: Number(plain.preco),
    experiencia: Number(plain.experiencia),
    created_at: plain.created_at,
  };
}

function calculateAverageScore(radar) {
  const scores = [
    radar.atendimento,
    radar.entrega,
    radar.qualidade,
    radar.preco,
    radar.experiencia,
  ].map((value) => Number(value || 0));

  const total = scores.reduce((sum, value) => sum + value, 0);
  return Number((total / scores.length).toFixed(1));
}

function requireScore(value, fieldName) {
  const parsed = toInteger(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    throw new AppError(400, `${fieldName} must be between 1 and 5`);
  }

  return parsed;
}

function buildRadarFromPayload(payload = {}) {
  const categorias = payload.categorias && typeof payload.categorias === 'object' ? payload.categorias : payload;

  return {
    atendimento: requireScore(categorias.atendimento, 'atendimento'),
    entrega: requireScore(categorias.entrega, 'entrega'),
    qualidade: requireScore(categorias.qualidade, 'qualidade'),
    preco: requireScore(categorias.preco, 'preco'),
    experiencia: requireScore(categorias.experiencia, 'experiencia'),
  };
}

exports.criarAvaliacao = async (user, payload = {}) => {
  const usuarioId = getUserId(user);
  const pedidoId = toInteger(payload.pedido_id);
  const payloadUsuarioId = String(payload.usuario_id || '').trim();

  if (!usuarioId) {
    throw new AppError(401, 'Authentication required');
  }

  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    throw new AppError(400, 'pedido_id is required');
  }

  if (payloadUsuarioId && payloadUsuarioId !== String(usuarioId)) {
    throw new AppError(403, 'usuario_id does not match authenticated user');
  }

  const pedido = await db.Pedido.findByPk(pedidoId);

  if (!pedido) {
    throw new AppError(404, 'Pedido não encontrado');
  }

  if (String(pedido.id_usuario) !== String(usuarioId)) {
    throw new AppError(403, 'Você não pode avaliar um pedido de outro usuário');
  }

  if (pedido.status === 'cancelado') {
    throw new AppError(400, 'Pedidos cancelados não podem ser avaliados');
  }

  const existing = await db.Avaliacao.findOne({
    where: {
      pedido_id: pedidoId,
      usuario_id: usuarioId,
    },
  });

  if (existing) {
    throw new AppError(409, 'Este pedido já foi avaliado');
  }

  const radar = buildRadarFromPayload(payload);
  const nota = calculateAverageScore(radar);
  const now = new Date();

  const avaliacao = await db.Avaliacao.create({
    pedido_id: pedidoId,
    usuario_id: usuarioId,
    nota,
    atendimento: radar.atendimento,
    entrega: radar.entrega,
    qualidade: radar.qualidade,
    preco: radar.preco,
    experiencia: radar.experiencia,
    created_at: now,
  });

  return toAvaliacaoPayload(avaliacao);
};

exports.buscarMinhaAvaliacao = async (user, pedidoIdValue) => {
  const usuarioId = getUserId(user);
  const pedidoId = toInteger(pedidoIdValue);

  if (!usuarioId) {
    throw new AppError(401, 'Authentication required');
  }

  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    throw new AppError(400, 'pedido_id is required');
  }

  const avaliacao = await db.Avaliacao.findOne({
    where: {
      pedido_id: pedidoId,
      usuario_id: usuarioId,
    },
  });

  return avaliacao ? toAvaliacaoPayload(avaliacao) : null;
};

exports.obterKpisSatisfacao = async () => {
  const [result] = await db.sequelize.query(`
    SELECT
      COUNT(*) AS total_avaliacoes,
      COALESCE(ROUND(AVG(nota), 2), 0) AS media_geral,
      SUM(CASE WHEN nota = 1 THEN 1 ELSE 0 END) AS nota_1,
      SUM(CASE WHEN nota = 2 THEN 1 ELSE 0 END) AS nota_2,
      SUM(CASE WHEN nota = 3 THEN 1 ELSE 0 END) AS nota_3,
      SUM(CASE WHEN nota = 4 THEN 1 ELSE 0 END) AS nota_4,
      SUM(CASE WHEN nota = 5 THEN 1 ELSE 0 END) AS nota_5,
      COALESCE(ROUND(AVG(atendimento), 2), 0) AS atendimento,
      COALESCE(ROUND(AVG(entrega), 2), 0) AS entrega,
      COALESCE(ROUND(AVG(qualidade), 2), 0) AS qualidade,
      COALESCE(ROUND(AVG(preco), 2), 0) AS preco,
      COALESCE(ROUND(AVG(experiencia), 2), 0) AS experiencia
    FROM avaliacoes
  `);

  const row = Array.isArray(result) ? result[0] : result;

  return {
    mediaGeral: Number(row?.media_geral || 0),
    totalAvaliacoes: Number(row?.total_avaliacoes || 0),
    distribuicao: {
      1: Number(row?.nota_1 || 0),
      2: Number(row?.nota_2 || 0),
      3: Number(row?.nota_3 || 0),
      4: Number(row?.nota_4 || 0),
      5: Number(row?.nota_5 || 0),
    },
    radar: {
      atendimento: Number(row?.atendimento || 0),
      entrega: Number(row?.entrega || 0),
      qualidade: Number(row?.qualidade || 0),
      preco: Number(row?.preco || 0),
      experiencia: Number(row?.experiencia || 0),
    },
  };
};