const db = require('../database/models');

/**
 * Registrar um evento de visitante
 * @param {string} evento - Tipo do evento
 * @param {string} ip - IP do visitante
 * @param {string} dispositivo - User-agent do dispositivo
 */
exports.registrarEvento = async (evento, ip, dispositivo) => {
  try {
    const eventoValido = [
      'visitou_home',
      'visualizou_produto',
      'adicionou_produto_no_carrinho',
      'checkout',
      'comprou',
    ];

    if (!eventoValido.includes(evento)) {
      console.warn(`[visitanteEventoService] Evento inválido: ${evento}`);
      return null;
    }

    const novoEvento = await db.VisitanteEvento.create({
      evento,
      ip: ip || null,
      dispositivo: dispositivo || null,
    });

    console.log(`[visitanteEventoService] Evento registrado: ${evento} (IP: ${ip})`);
    return novoEvento;
  } catch (error) {
    console.error('[visitanteEventoService] Erro ao registrar evento:', error.message);
    return null;
  }
};

/**
 * Obter estatísticas de eventos
 */
exports.obterEstatisticas = async () => {
  try {
    const eventos = await db.VisitanteEvento.findAll({
      attributes: [
        'evento',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total'],
      ],
      group: ['evento'],
      raw: true,
    });

    return eventos;
  } catch (error) {
    console.error('[visitanteEventoService] Erro ao obter estatísticas:', error.message);
    return [];
  }
};

/**
 * Obter eventos dos últimos N dias
 */
exports.obterEventosRecentes = async (diasAtras = 7) => {
  try {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - diasAtras);

    const eventos = await db.VisitanteEvento.findAll({
      where: {
        criado_em: {
          [db.Sequelize.Op.gte]: dataInicio,
        },
      },
      order: [['criado_em', 'DESC']],
    });

    return eventos;
  } catch (error) {
    console.error('[visitanteEventoService] Erro ao obter eventos recentes:', error.message);
    return [];
  }
};
