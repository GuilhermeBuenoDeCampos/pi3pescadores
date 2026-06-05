'use strict';

const db = require('../database/models');
const { Op } = require('sequelize');

const leadtimeStages = ['visitante', 'carrinho', 'pendente', 'confirmado', 'preparando', 'enviado', 'concluido'];

exports.registrarEventoLeadtime = async (pedidoId, usuarioId, stage) => {
  try {
    if (!leadtimeStages.includes(stage)) {
      throw new Error(`Stage inválido: ${stage}`);
    }

    let leadtime = await db.Leadtime.findOne({
      where: { pedido_id: pedidoId },
    });

    if (!leadtime) {
      leadtime = await db.Leadtime.create({
        pedido_id: pedidoId,
        usuarios_id: usuarioId,
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
    // Buscar eventos do visitante para esse usuário
    const eventos = await db.VisitanteEvento.findAll({
      where: {
        usuario_id: usuarioId,
        criado_em: {
          [Op.lte]: dataPedido,
        },
      },
      order: [['criado_em', 'ASC']],
    });

    // Encontrar as datas dos eventos
    const visitanteEvento = eventos.find(e => e.evento === 'visitou_home');
    const carrinhoEvento = eventos.find(e => e.evento === 'adicionou_produto_no_carrinho');

    // Criar o leadtime com as datas dos eventos
    const leadtimeData = {
      pedido_id: pedidoId,
      usuarios_id: usuarioId,
      visitante: visitanteEvento?.criado_em || null,
      carrinho: carrinhoEvento?.criado_em || null,
      pendente: dataPedido,
    };

    const leadtime = await db.Leadtime.create(leadtimeData);
    return leadtime;
  } catch (error) {
    console.error('Erro ao criar leadtime com eventos:', error);
    throw error;
  }
};

exports.calcularMediaLeadtime = async () => {
  try {
    const leadtimes = await db.Leadtime.findAll({
      where: {
        concluido: {
          [Op.ne]: null,
        },
      },
      raw: true,
    });

    if (leadtimes.length === 0) {
      return {
        media_geral_dias: 0,
        media_geral_horas: 0,
        media_geral_minutos: 0,
        por_etapa: {},
        total_pedidos: 0,
      };
    }

    const medias = {
      visitante_carrinho: [],
      carrinho_pendente: [],
      pendente_confirmado: [],
      confirmado_preparando: [],
      preparando_enviado: [],
      enviado_concluido: [],
      visitante_concluido: [],
    };

    leadtimes.forEach((lt) => {
      if (lt.visitante && lt.carrinho) {
        medias.visitante_carrinho.push(
          (new Date(lt.carrinho) - new Date(lt.visitante)) / (1000 * 60 * 60)
        );
      }
      if (lt.carrinho && lt.pendente) {
        medias.carrinho_pendente.push(
          (new Date(lt.pendente) - new Date(lt.carrinho)) / (1000 * 60 * 60)
        );
      }
      if (lt.pendente && lt.confirmado) {
        medias.pendente_confirmado.push(
          (new Date(lt.confirmado) - new Date(lt.pendente)) / (1000 * 60 * 60)
        );
      }
      if (lt.confirmado && lt.preparando) {
        medias.confirmado_preparando.push(
          (new Date(lt.preparando) - new Date(lt.confirmado)) / (1000 * 60 * 60)
        );
      }
      if (lt.preparando && lt.enviado) {
        medias.preparando_enviado.push(
          (new Date(lt.enviado) - new Date(lt.preparando)) / (1000 * 60 * 60)
        );
      }
      if (lt.enviado && lt.concluido) {
        medias.enviado_concluido.push(
          (new Date(lt.concluido) - new Date(lt.enviado)) / (1000 * 60 * 60)
        );
      }
      if (lt.visitante && lt.concluido) {
        medias.visitante_concluido.push(
          (new Date(lt.concluido) - new Date(lt.visitante)) / (1000 * 60 * 60)
        );
      }
    });

    const calcularMedia = (valores) => {
      if (valores.length === 0) return 0;
      return valores.reduce((a, b) => a + b, 0) / valores.length;
    };

    const mediaGeralHoras = calcularMedia(medias.visitante_concluido);
    const mediaGeralDias = mediaGeralHoras / 24;
    const mediaGeralMinutos = (mediaGeralHoras % 1) * 60;

    return {
      media_geral_dias: parseFloat(mediaGeralDias.toFixed(2)),
      media_geral_horas: parseFloat(mediaGeralHoras.toFixed(2)),
      media_geral_minutos: parseFloat(mediaGeralMinutos.toFixed(0)),
      por_etapa: {
        visitante_carrinho: parseFloat(calcularMedia(medias.visitante_carrinho).toFixed(2)),
        carrinho_pendente: parseFloat(calcularMedia(medias.carrinho_pendente).toFixed(2)),
        pendente_confirmado: parseFloat(calcularMedia(medias.pendente_confirmado).toFixed(2)),
        confirmado_preparando: parseFloat(calcularMedia(medias.confirmado_preparando).toFixed(2)),
        preparando_enviado: parseFloat(calcularMedia(medias.preparando_enviado).toFixed(2)),
        enviado_concluido: parseFloat(calcularMedia(medias.enviado_concluido).toFixed(2)),
      },
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
          attributes: ['id', 'numero_pedido', 'status'],
        },
        {
          association: 'usuario',
          attributes: ['id', 'nome', 'email'],
        },
      ],
    });

    return leadtimes;
  } catch (error) {
    console.error('Erro ao obter leadtime por período:', error);
    throw error;
  }
};
