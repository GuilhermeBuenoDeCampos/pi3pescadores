const db = require('../database/models');

/**
 * Registrar um evento de visitante
 * @param {string} evento - Tipo do evento
 * @param {string} ip - IP do visitante
 * @param {string} dispositivo - User-agent do dispositivo
 * @param {number} usuarioId - ID do usuário autenticado (opcional)
 */
exports.registrarEvento = async (evento, ip, dispositivo, usuarioId = null) => {
  try {
    const eventoValido = [
      'visitou_home',
      'visualizou_produto',
      'adicionou_produto_no_carrinho',
      'checkout',
      'comprou',
    ];

    console.log('[visitanteEventoService] Validando evento:', evento);
    console.log('[visitanteEventoService] Eventos válidos:', eventoValido);
    console.log('[visitanteEventoService] Evento é válido?', eventoValido.includes(evento));

    if (!eventoValido.includes(evento)) {
      console.warn(`[visitanteEventoService] Evento inválido: "${evento}"`);
      return null;
    }

    // Se usuário está autenticado, vincular eventos anteriores do mesmo IP
    if (usuarioId && ip) {
      console.log(`[visitanteEventoService] Vinculando eventos anteriores do IP ${ip} ao usuário ${usuarioId}`);
      
      // Atualizar eventos sem usuario_id do mesmo IP para adicionar o usuario_id
      const [updated] = await db.VisitanteEvento.update(
        { usuario_id: usuarioId },
        {
          where: {
            ip: ip,
            usuario_id: null, // Apenas eventos sem usuario_id
          },
        }
      );
      
      if (updated > 0) {
        console.log(`[visitanteEventoService] ${updated} evento(s) anterior(es) vinculado(s) ao usuário`);
      }
    }

    console.log('[visitanteEventoService] Tentando criar registro no banco...');
    const novoEvento = await db.VisitanteEvento.create({
      evento,
      ip: ip || null,
      dispositivo: dispositivo || null,
      usuario_id: usuarioId || null,
    });

    console.log(`[visitanteEventoService] Evento registrado: ${evento} (ID: ${novoEvento.id}, IP: ${ip}, usuarioId: ${usuarioId})`);
    return novoEvento;
  } catch (error) {
    console.error('[visitanteEventoService] Erro ao registrar evento:', error.message);
    console.error('[visitanteEventoService] Stack:', error.stack);
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

/**
 * Calcular taxa de conversão: visitantes únicos vs pedidos confirmados
 * Retorna dados dos últimos 12 meses
 */
exports.obterTaxaConversao = async () => {
  try {
    // Pegar últimos 12 meses
    const data12MesesAtras = new Date();
    data12MesesAtras.setMonth(data12MesesAtras.getMonth() - 12);

    const isMysql = db.sequelize.getDialect() === 'mysql';
    const visitanteMes = isMysql ? "DATE_FORMAT(ve.created_at, '%Y-%m-01')" : "DATE_TRUNC('month', ve.created_at)";
    const pedidoMes = isMysql ? "DATE_FORMAT(p.criado_em, '%Y-%m-01')" : "DATE_TRUNC('month', p.criado_em)";
    const visitanteIdentidade = isMysql ? 'COALESCE(ve.usuario_id, ve.ip)' : 'COALESCE(ve.usuario_id::text, ve.ip)';

    // Query para visitantes únicos que visitaram home (por mês)
    // Conta usuários logados como únicos por usuario_id, e não-logados como únicos por IP
    const visitantesQuery = await db.sequelize.query(`
      SELECT 
        ${visitanteMes} AS mes,
        COUNT(DISTINCT ${visitanteIdentidade}) AS visitantes_unicos
      FROM visitante_evento ve
      WHERE ve.evento = 'visitou_home' 
        AND ve.created_at >= :dataLimite
      GROUP BY ${visitanteMes}
      ORDER BY mes DESC
    `, {
      replacements: { dataLimite: data12MesesAtras },
      type: db.sequelize.QueryTypes.SELECT,
    });

    // Query para pedidos confirmados (por mês)
    const pedidosQuery = await db.sequelize.query(`
      SELECT 
        ${pedidoMes} AS mes,
        COUNT(DISTINCT p.id) AS pedidos_confirmados
      FROM pedidos p
      WHERE p.status IN ('confirmado', 'preparando', 'enviado', 'concluido')
        AND p.criado_em >= :dataLimite
      GROUP BY ${pedidoMes}
      ORDER BY mes DESC
    `, {
      replacements: { dataLimite: data12MesesAtras },
      type: db.sequelize.QueryTypes.SELECT,
    });

    // Combinar dados
    const resultado = visitantesQuery.map(v => {
      const pedido = pedidosQuery.find(p => 
        new Date(p.mes).getTime() === new Date(v.mes).getTime()
      );
      
      const visitantes = parseInt(v.visitantes_unicos) || 0;
      const pedidos = parseInt(pedido?.pedidos_confirmados) || 0;
      const taxa = visitantes > 0 ? ((pedidos / visitantes) * 100).toFixed(2) : 0;

      return {
        mes: v.mes,
        visitantes_unicos: visitantes,
        pedidos_confirmados: pedidos,
        taxa_conversao: parseFloat(taxa),
      };
    });

    console.log('[visitanteEventoService] Taxa de conversão calculada:', resultado.length, 'meses');
    return resultado;
  } catch (error) {
    console.error('[visitanteEventoService] Erro ao calcular taxa de conversão:', error.message);
    return [];
  }
};
