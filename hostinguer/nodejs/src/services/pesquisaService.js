const db = require('../database/models');
const AppError = require('../middlewares/appError');
const { Op } = require('sequelize');

function sanitizarPalavra(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

async function getProximoId(transaction) {
  const ultimoId = await db.PalavraPesquisada.max('id', { transaction });
  const parsed = Number(ultimoId || 0);

  return parsed + 1;
}

exports.registrarPalavra = async (payload) => {
  const palavra = sanitizarPalavra(payload.palavra);

  if (!palavra) {
    throw new AppError(400, 'palavra is required');
  }

  const registro = await db.sequelize.transaction(async (transaction) => {
    const id = await getProximoId(transaction);

    return db.PalavraPesquisada.create(
      {
        id,
        palavra,
        created_at: new Date(),
      },
      { transaction }
    );
  });

  return {
    id: registro.id,
    palavra: registro.palavra,
    created_at: registro.created_at,
  };
};

exports.listarMaisPesquisadas = async (limit = 5) => {
  const parsedLimit = Number(limit);
  const safeLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 && parsedLimit <= 20
    ? parsedLimit
    : 5;

  const rows = await db.PalavraPesquisada.findAll({
    attributes: [
      'palavra',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total'],
    ],
    where: {
      palavra: {
        [Op.ne]: null,
      },
    },
    group: ['palavra'],
    order: [
      [db.sequelize.literal('total'), 'DESC'],
      ['palavra', 'ASC'],
    ],
    limit: safeLimit,
    raw: true,
  });

  return rows
    .filter((row) => String(row.palavra || '').trim())
    .map((row) => ({
      palavra: row.palavra,
      total: Number(row.total || 0),
    }));
};

exports.sanitizarPalavra = sanitizarPalavra;
