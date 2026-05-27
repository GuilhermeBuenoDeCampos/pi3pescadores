'use strict';

const db = require('../database/models');

exports.obterConfig = async () => {
  const config = await db.KpiConfig.findOne({ order: [['id', 'ASC']], raw: true });
  if (!config) {
    return { ticketbaixo: '75.00', ticketalto: '200.00' };
  }
  return {
    ticketbaixo: String(config.ticketbaixo),
    ticketalto: String(config.ticketalto),
  };
};

exports.atualizarConfig = async (body) => {
  const ticketbaixo = String(body.ticketbaixo ?? '').trim();
  const ticketalto = String(body.ticketalto ?? '').trim();

  if (!ticketbaixo || !ticketalto) {
    throw Object.assign(new Error('ticketbaixo e ticketalto são obrigatórios'), { statusCode: 400 });
  }

  let config = await db.KpiConfig.findOne({ order: [['id', 'ASC']] });
  if (config) {
    await config.update({ ticketbaixo, ticketalto, update_at: new Date() });
  } else {
    config = await db.KpiConfig.create({
      ticketbaixo,
      ticketalto,
      created_at: new Date(),
      update_at: new Date(),
    });
  }

  return { ticketbaixo: String(config.ticketbaixo), ticketalto: String(config.ticketalto) };
};
