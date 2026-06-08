const { Transaction } = require('sequelize');
const db = require('../database/models');
const AppError = require('../middlewares/appError');

const ACTIVE_STATUS = 'ativo';
const MERGED_STATUS = 'merged';

function normalizeImageUrl(url) {
  const rawUrl = String(url || '').trim().replace(/\s+/g, '');
  return rawUrl;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeGuestToken(value) {
  const token = String(value || '').trim();
  return token || null;
}

function normalizeCartItem(item) {
  const plain = item.toJSON ? item.toJSON() : item;
  const product = plain.produto || plain.Produto || null;
  const productPlain = product && product.toJSON ? product.toJSON() : product;

  return {
    id: plain.id,
    carrinho_id: plain.carrinho_id,
    produto_id: plain.produto_id,
    quantidade: toNumber(plain.quantidade, 0),
    preco_unitario: plain.preco_unitario,
    produto: productPlain
      ? {
          id: productPlain.id,
          nome: productPlain.nome,
          preco_venda: productPlain.preco_venda,
          imagens: Array.isArray(productPlain.imagens)
            ? productPlain.imagens.map((imagem) => ({
                id: imagem.id,
                url: normalizeImageUrl(imagem.url),
                criado_em: imagem.criado_em,
              }))
            : [],
        }
      : null,
  };
}

function calcularSubtotal(itens) {
  return itens.reduce((total, item) => {
    const preco = toNumber(item.preco_unitario ?? item.produto?.preco_venda, 0);
    return total + preco * toNumber(item.quantidade, 0);
  }, 0);
}

function toCartPayload(carrinho) {
  const plain = carrinho.toJSON ? carrinho.toJSON() : carrinho;
  const itens = Array.isArray(plain.itens) ? plain.itens.map(normalizeCartItem) : [];
  const subtotal = calcularSubtotal(itens);

  return {
    id: plain.id,
    usuario_id: plain.usuario_id,
    guest_token: plain.guest_token,
    status: plain.status,
    criado_em: plain.criado_em,
    atualizado_em: plain.atualizado_em,
    ultima_interacao_em: plain.ultima_interacao_em,
    itens,
    total_itens: itens.reduce((total, item) => total + toNumber(item.quantidade, 0), 0),
    subtotal,
    total: subtotal,
  };
}

async function buscarProdutoPorId(produtoId, transaction) {
  const produto = await db.Produto.findByPk(produtoId, {
    include: [
      {
        model: db.ProdutoImagem,
        as: 'imagens',
        attributes: ['id', 'url', 'criado_em'],
      },
    ],
    transaction,
  });

  if (!produto) {
    throw new AppError(404, 'Produto not found');
  }

  return produto;
}

async function carregarCarrinho(carrinhoId, transaction) {
  const carrinho = await db.Carrinho.findByPk(carrinhoId, {
    include: [
      {
        model: db.CarrinhoItem,
        as: 'itens',
        include: [
          {
            model: db.Produto,
            as: 'produto',
            include: [
              {
                model: db.ProdutoImagem,
                as: 'imagens',
                attributes: ['id', 'url', 'criado_em'],
              },
            ],
          },
        ],
      },
    ],
    transaction,
  });

  if (!carrinho) {
    throw new AppError(404, 'Carrinho not found');
  }

  return carrinho;
}

async function buscarCarrinhoAtivo({ userId, guestToken, transaction, createIfMissing = true }) {
  const normalizedGuestToken = normalizeGuestToken(guestToken);
  const where = userId
    ? { usuario_id: userId, status: ACTIVE_STATUS }
    : { guest_token: normalizedGuestToken, status: ACTIVE_STATUS };

  const carrinho = await db.Carrinho.findOne({
    where,
    attributes: ['id', 'usuario_id', 'guest_token', 'status', 'criado_em', 'atualizado_em', 'ultima_interacao_em'],
    transaction,
    lock: transaction ? Transaction.LOCK.UPDATE : undefined,
  });

  if (carrinho || !createIfMissing) {
    return carrinho;
  }

  const now = new Date();
  const criado = await db.Carrinho.create(
    {
      usuario_id: userId || null,
      guest_token: normalizedGuestToken,
      status: ACTIVE_STATUS,
      criado_em: now,
      atualizado_em: now,
      ultima_interacao_em: now,
    },
    { transaction }
  );

  return carregarCarrinho(criado.id, transaction);
}

async function salvarOuIncrementarItem({ carrinhoId, produtoId, quantidade, transaction }) {
  const produto = await buscarProdutoPorId(produtoId, transaction);

  const itemExistente = await db.CarrinhoItem.findOne({
    where: {
      carrinho_id: carrinhoId,
      produto_id: produtoId,
    },
    transaction,
    lock: transaction ? Transaction.LOCK.UPDATE : undefined,
  });

  if (itemExistente) {
    await itemExistente.update(
      {
        quantidade: toNumber(itemExistente.quantidade, 0) + quantidade,
        preco_unitario: produto.preco_venda,
      },
      { transaction }
    );
    return itemExistente;
  }

  return db.CarrinhoItem.create(
    {
      carrinho_id: carrinhoId,
      produto_id: produtoId,
      quantidade,
      preco_unitario: produto.preco_venda,
    },
    { transaction }
  );
}

async function atualizarInteracaoCarrinho(carrinho, transaction) {
  const now = new Date();
  await carrinho.update(
    {
      atualizado_em: now,
      ultima_interacao_em: now,
    },
    { transaction }
  );
}

async function mesclarItensCarrinhos({ origemCarrinho, destinoCarrinho, transaction }) {
  const itensOrigem = await db.CarrinhoItem.findAll({
    where: { carrinho_id: origemCarrinho.id },
    transaction,
    lock: transaction ? Transaction.LOCK.UPDATE : undefined,
  });

  for (const item of itensOrigem) {
    const existente = await db.CarrinhoItem.findOne({
      where: {
        carrinho_id: destinoCarrinho.id,
        produto_id: item.produto_id,
      },
      transaction,
      lock: transaction ? Transaction.LOCK.UPDATE : undefined,
    });

    if (existente) {
      await existente.update(
        {
          quantidade: toNumber(existente.quantidade, 0) + toNumber(item.quantidade, 0),
        },
        { transaction }
      );
    } else {
      await db.CarrinhoItem.create(
        {
          carrinho_id: destinoCarrinho.id,
          produto_id: item.produto_id,
          quantidade: item.quantidade,
        },
        { transaction }
      );
    }
  }

  await db.CarrinhoItem.destroy({
    where: { carrinho_id: origemCarrinho.id },
    transaction,
  });
}

exports.obterCarrinhoAtivo = async ({ userId, guestToken }) => {
  const carrinho = await db.sequelize.transaction(async (transaction) => {
    const encontrado = await buscarCarrinhoAtivo({ userId, guestToken, transaction, createIfMissing: true });
    await atualizarInteracaoCarrinho(encontrado, transaction);
    return carregarCarrinho(encontrado.id, transaction);
  });

  return toCartPayload(carrinho);
};

exports.adicionarItem = async ({ userId, guestToken, produtoId, quantidade = 1 }) => {
  if (!Number.isInteger(produtoId) || produtoId <= 0) {
    throw new AppError(400, 'produto_id must be a valid integer');
  }

  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new AppError(400, 'quantidade must be a positive integer');
  }

  const carrinho = await db.sequelize.transaction(async (transaction) => {
    const encontrado = await buscarCarrinhoAtivo({ userId, guestToken, transaction, createIfMissing: true });
    await salvarOuIncrementarItem({ carrinhoId: encontrado.id, produtoId, quantidade, transaction });
    await atualizarInteracaoCarrinho(encontrado, transaction);
    return carregarCarrinho(encontrado.id, transaction);
  });

  return toCartPayload(carrinho);
};

exports.atualizarItem = async ({ userId, guestToken, itemId, quantidade }) => {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    throw new AppError(400, 'item_id must be a valid integer');
  }

  if (!Number.isInteger(quantidade) || quantidade < 0) {
    throw new AppError(400, 'quantidade must be a non-negative integer');
  }

  const carrinho = await db.sequelize.transaction(async (transaction) => {
    const encontrado = await buscarCarrinhoAtivo({ userId, guestToken, transaction, createIfMissing: true });
    const item = await db.CarrinhoItem.findOne({
      where: {
        id: itemId,
        carrinho_id: encontrado.id,
      },
      transaction,
      lock: transaction ? Transaction.LOCK.UPDATE : undefined,
    });

    if (!item) {
      throw new AppError(404, 'Cart item not found');
    }

    if (quantidade === 0) {
      await item.destroy({ transaction });
    } else {
      await item.update({ quantidade }, { transaction });
    }

    await atualizarInteracaoCarrinho(encontrado, transaction);
    return carregarCarrinho(encontrado.id, transaction);
  });

  return toCartPayload(carrinho);
};

exports.removerItem = async ({ userId, guestToken, itemId }) => {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    throw new AppError(400, 'item_id must be a valid integer');
  }

  const carrinho = await db.sequelize.transaction(async (transaction) => {
    const encontrado = await buscarCarrinhoAtivo({ userId, guestToken, transaction, createIfMissing: true });
    const item = await db.CarrinhoItem.findOne({
      where: {
        id: itemId,
        carrinho_id: encontrado.id,
      },
      transaction,
      lock: transaction ? Transaction.LOCK.UPDATE : undefined,
    });

    if (!item) {
      throw new AppError(404, 'Cart item not found');
    }

    await item.destroy({ transaction });
    await atualizarInteracaoCarrinho(encontrado, transaction);
    return carregarCarrinho(encontrado.id, transaction);
  });

  return toCartPayload(carrinho);
};

exports.associarCarrinhoGuestAoUsuario = async ({ guestToken, userId }) => {
  const normalizedGuestToken = normalizeGuestToken(guestToken);

  if (!userId) {
    throw new AppError(400, 'userId is required');
  }

  const carrinho = await db.sequelize.transaction(async (transaction) => {
    const carrinhoUsuario = await buscarCarrinhoAtivo({ userId, guestToken: null, transaction, createIfMissing: true });
    const carrinhoGuest = normalizedGuestToken
      ? await buscarCarrinhoAtivo({ userId: null, guestToken: normalizedGuestToken, transaction, createIfMissing: false })
      : null;

    if (!carrinhoGuest) {
      if (normalizedGuestToken && carrinhoUsuario.guest_token !== normalizedGuestToken) {
        await carrinhoUsuario.update(
          {
            guest_token: normalizedGuestToken,
            atualizado_em: new Date(),
            ultima_interacao_em: new Date(),
          },
          { transaction }
        );
      }

      return carregarCarrinho(carrinhoUsuario.id, transaction);
    }

    if (carrinhoUsuario.id === carrinhoGuest.id) {
      await carrinhoGuest.update(
        {
          usuario_id: userId,
          guest_token: normalizedGuestToken,
          atualizado_em: new Date(),
          ultima_interacao_em: new Date(),
        },
        { transaction }
      );

      return carregarCarrinho(carrinhoGuest.id, transaction);
    }

    await mesclarItensCarrinhos({ origemCarrinho: carrinhoGuest, destinoCarrinho: carrinhoUsuario, transaction });

    await carrinhoGuest.update(
      {
        status: MERGED_STATUS,
        usuario_id: userId,
        atualizado_em: new Date(),
        ultima_interacao_em: new Date(),
      },
      { transaction }
    );

    await carrinhoUsuario.update(
      {
        usuario_id: userId,
        guest_token: normalizedGuestToken || carrinhoUsuario.guest_token,
        atualizado_em: new Date(),
        ultima_interacao_em: new Date(),
      },
      { transaction }
    );

    return carregarCarrinho(carrinhoUsuario.id, transaction);
  });

  return toCartPayload(carrinho);
};
