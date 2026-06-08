const asyncHandler = require('../utils/asyncHandler');
const db = require('../database/models');

function getDiferencaExpression() {
  return '(quantidade_fisica - quantidade_sistema)';
}

function getAcuracidadeExpression() {
  if (db.sequelize.getDialect() === 'mysql') {
    return `
      CASE
        WHEN quantidade_sistema = 0 THEN IF(quantidade_fisica = 0, 100, 0)
        ELSE GREATEST(
          0,
          LEAST(
            100,
            ((quantidade_sistema - ABS(quantidade_fisica - quantidade_sistema)) / quantidade_sistema) * 100
          )
        )
      END
    `;
  }

  return `
    CASE
      WHEN quantidade_sistema = 0 THEN CASE WHEN quantidade_fisica = 0 THEN 100 ELSE 0 END
      ELSE GREATEST(
        0,
        LEAST(
          100,
          ((quantidade_sistema - ABS(quantidade_fisica - quantidade_sistema))::decimal / quantidade_sistema) * 100
        )
      )
    END
  `;
}

exports.getProdutosAleatorios = asyncHandler(async (req, res) => {
  const produtos = await db.Produto.findAll({
    attributes: ['id', 'nome', 'preco_venda'],
    limit: 5,
    order: db.sequelize.random(),
  });

  const produtosComEstoque = await Promise.all(
    produtos.map(async (produto) => {
      const movimentacoes = await db.EstoqueMovimentacao.findAll({
        where: { id_produto: produto.id },
        attributes: ['tipo', 'quantidade'],
      });

      const estoque = movimentacoes.reduce((total, movimentacao) => {
        const quantidade = Number(movimentacao.quantidade) || 0;
        return movimentacao.tipo === 'entrada' ? total + quantidade : total - quantidade;
      }, 0);

      return {
        id: produto.id,
        nome: produto.nome,
        preco_venda: produto.preco_venda,
        quantidade_sistema: Math.max(0, estoque),
      };
    })
  );

  res.json({ data: produtosComEstoque });
});

exports.salvarAuditoria = asyncHandler(async (req, res) => {
  const { auditorias } = req.body;

  if (!Array.isArray(auditorias) || auditorias.length === 0) {
    return res.status(400).json({
      error: { message: 'Invalid audit data' },
    });
  }

  const registros = auditorias.map((item) => ({
    product_id: item.product_id,
    quantidade_sistema: item.quantidade_sistema,
    quantidade_fisica: item.quantidade_fisica,
    observacoes: item.observacoes || null,
    usuario_id: req.user?.id || null,
  }));

  const resultado = await db.AuditoriaProduto.bulkCreate(registros);

  res.json({
    message: 'Audit records saved successfully',
    data: resultado,
  });
});

exports.getHistoricoAuditoria = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const offset = (page - 1) * limit;

  const { count, rows } = await db.AuditoriaProduto.findAndCountAll({
    attributes: {
      include: [
        [db.sequelize.literal(getDiferencaExpression()), 'diferenca'],
        [db.sequelize.literal(getAcuracidadeExpression()), 'acuracidade'],
      ],
    },
    include: [
      {
        model: db.Produto,
        as: 'produto',
        attributes: ['id', 'nome'],
      },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  res.json({
    data: rows,
    pagination: {
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
    },
  });
});

exports.getMediaAcuracidade = asyncHandler(async (req, res) => {
  const media = await db.AuditoriaProduto.findOne({
    attributes: [
      [db.sequelize.fn('AVG', db.sequelize.literal(getAcuracidadeExpression())), 'media_acuracidade'],
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total_auditorias'],
    ],
    raw: true,
  });

  const mediaAcuracidade = Number(media?.media_acuracidade || 0);
  const totalAuditorias = Number(media?.total_auditorias || 0);

  res.json({
    data: {
      media_acuracidade: Number(mediaAcuracidade.toFixed(2)),
      total_auditorias: totalAuditorias,
    },
  });
});
