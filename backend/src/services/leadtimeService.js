'use strict';

const db = require('../database/models');
const { Op } = require('sequelize');

const leadtimeStages = ['visitante', 'carrinho', 'pendente', 'confirmado', 'preparando', 'enviado', 'concluido'];

function diffHours(start, end) {
  if (!start || !end) return null;

  const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60);
  return Number.isFinite(diff) && diff >= 0 ? diff : null;
}

function calcularMedia(valores) {
  if (!valores.length) return 0;
  return valores.reduce((total, valor) => total + valor, 0) / valores.length;
}

function formatDuration(hours) {
  const totalMinutes = Math.max(0, Math.round(Number(hours || 0) * 60));

  if (totalMinutes < 60) {
    return `${totalMinutes}min`;
  }

  const days = Math.floor(totalMinutes / 1440);
  const hoursRemainder = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hoursRemainder}h`;
  }

  return minutes > 0 ? `${hoursRemainder}h ${minutes}min` : `${hoursRemainder}h`;
}

function resumirEtapa(valores) {
  const mediaHoras = calcularMedia(valores);
  const mediaMinutos = mediaHoras * 60;

  return {
    horas: parseFloat(mediaHoras.toFixed(2)),
    minutos: parseFloat(mediaMinutos.toFixed(0)),
    label: formatDuration(mediaHoras),
    total: valores.length,
  };
}

exports.registrarEventoLeadtime = async (pedidoId, usuarioId, stage) => {
  try {
    if (!leadtimeStages.includes(stage)) {
      throw new Error(`Stage invalido: ${stage}`);
    }

    let leadtime = await db.Leadtime.findOne({
      where: { pedido_id: pedidoId },
    });

    if (!leadtime) {
      leadtime = await db.Leadtime.create({
        pedido_id: pedidoId,
        [stage]: new Date(),
      });
    } else {
      const update = {};
      if (!leadtime[stage]) {
        update[stage] = new Date();
      }
      await leadtime.update(update);
    }

    return leadtime;
  } catch (error) {
    console.error('Erro ao registrar evento leadtime:', error);
    throw error;
  }
};

exports.criarLeadtimeComEventos = async (pedidoId, usuarioId, dataPedido) => {
  try {
    const eventos = await db.VisitanteEvento.findAll({
      where: {
        usuario_id: usuarioId,
        criado_em: {
          [Op.lte]: dataPedido,
        },
      },
      order: [['criado_em', 'ASC']],
    });

    const visitanteEvento = eventos.find(e => e.evento === 'visitou_home');
    const carrinhoEvento = eventos.find(e => e.evento === 'adicionou_produto_no_carrinho');

    const leadtimeData = {
      pedido_id: pedidoId,
      visitante: visitanteEvento?.criado_em || null,
      carrinho: carrinhoEvento?.criado_em || null,
      pendente: dataPedido,
    };

    const [leadtime, created] = await db.Leadtime.findOrCreate({
      where: { pedido_id: pedidoId },
      defaults: leadtimeData,
    });

    if (!created) {
      const updates = Object.fromEntries(
        Object.entries(leadtimeData).filter(([key, value]) => key !== 'pedido_id' && value && !leadtime[key])
      );

      if (Object.keys(updates).length > 0) {
        await leadtime.update(updates);
      }
    }

    return leadtime;
  } catch (error) {
    console.error('Erro ao criar leadtime com eventos:', error);
    throw error;
  }
};

exports.calcularMediaLeadtime = async () => {
  try {
    const leadtimes = await db.Leadtime.findAll({
      raw: true,
    });

    if (leadtimes.length === 0) {
      return {
        media_geral_dias: 0,
        media_geral_horas: 0,
        media_geral_minutos: 0,
        media_geral_label: '0min',
        por_etapa: {},
        detalhes_por_etapa: {},
        total_pedidos: 0,
      };
    }

    const medias = {
      visitante_carrinho: [],
      carrinho_confirmado: [],
      confirmado_preparando: [],
      preparando_enviado: [],
      enviado_concluido: [],
      visitante_concluido: [],
    };

    leadtimes.forEach((lt) => {
      const etapaValores = {
        visitante_carrinho: diffHours(lt.visitante, lt.carrinho),
        carrinho_confirmado: diffHours(lt.carrinho, lt.confirmado),
        confirmado_preparando: diffHours(lt.confirmado, lt.preparando),
        preparando_enviado: diffHours(lt.preparando, lt.enviado),
        enviado_concluido: diffHours(lt.enviado, lt.concluido),
        visitante_concluido: diffHours(lt.visitante, lt.concluido),
      };

      Object.entries(etapaValores).forEach(([key, value]) => {
        if (value !== null) {
          medias[key].push(value);
        }
      });
    });

    const detalhesPorEtapa = {
      visitante_carrinho: resumirEtapa(medias.visitante_carrinho),
      carrinho_confirmado: resumirEtapa(medias.carrinho_confirmado),
      confirmado_preparando: resumirEtapa(medias.confirmado_preparando),
      preparando_enviado: resumirEtapa(medias.preparando_enviado),
      enviado_concluido: resumirEtapa(medias.enviado_concluido),
    };

    const mediaGeralHoras = calcularMedia(medias.visitante_concluido);
    const mediaGeralDias = mediaGeralHoras / 24;
    const mediaGeralMinutos = (mediaGeralHoras % 1) * 60;

    return {
      media_geral_dias: parseFloat(mediaGeralDias.toFixed(2)),
      media_geral_horas: parseFloat(mediaGeralHoras.toFixed(2)),
      media_geral_minutos: parseFloat(mediaGeralMinutos.toFixed(0)),
      media_geral_label: formatDuration(mediaGeralHoras),
      por_etapa: {
        visitante_carrinho: detalhesPorEtapa.visitante_carrinho.horas,
        carrinho_confirmado: detalhesPorEtapa.carrinho_confirmado.horas,
        confirmado_preparando: detalhesPorEtapa.confirmado_preparando.horas,
        preparando_enviado: detalhesPorEtapa.preparando_enviado.horas,
        enviado_concluido: detalhesPorEtapa.enviado_concluido.horas,
      },
      detalhes_por_etapa: detalhesPorEtapa,
      total_pedidos: leadtimes.length,
    };
  } catch (error) {
    console.error('Erro ao calcular média de leadtime:', error);
    throw error;
  }
};

exports.obterLeadtimePorPeriodo = async (mesAtras = 1) => {
  try {
    const dataInicio = new Date();
    dataInicio.setMonth(dataInicio.getMonth() - mesAtras);
    dataInicio.setDate(1);
    dataInicio.setHours(0, 0, 0, 0);

    const dataFim = new Date();
    dataFim.setHours(23, 59, 59, 999);

    const leadtimes = await db.Leadtime.findAll({
      where: {
        concluido: {
          [Op.between]: [dataInicio, dataFim],
        },
      },
      include: [
        {
          association: 'pedido',
          attributes: ['id', 'numero_pedido', 'status', 'id_usuario'],
          include: [
            {
              association: 'usuario',
              attributes: ['id', 'nome', 'email'],
            },
          ],
        },
      ],
    });

    return leadtimes;
  } catch (error) {
    console.error('Erro ao obter leadtime por período:', error);
    throw error;
  }
};
