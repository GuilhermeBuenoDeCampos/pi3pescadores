const db = require('../database/models');
const AppError = require('../middlewares/appError');

const ALLOWED_MOVEMENT_TYPES = new Set(['entrada', 'saida']);
const ALLOWED_MOVEMENT_REASONS = new Set(['compra', 'venda', 'ajuste']);

// Utility function to generate slug from product name for URL-friendly routing
function generateSlug(nome) {
  if (!nome || typeof nome !== 'string') return '';
  
  return nome
    .toLowerCase()
    .trim()
    .normalize('NFD')                          // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '')           // Remove accent marks
    .replace(/[^a-z0-9\s-]/g, '')              // Remove non-alphanumeric except spaces/hyphens
    .replace(/[\s_-]+/g, '-')                  // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, '');                  // Remove leading/trailing hyphens
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatDecimal(value, scale) {
  const n = toNumberOrNull(value);
  if (n === null) return null;
  // Use toFixed to produce a string with the desired scale and avoid floating artifacts
  return n.toFixed(scale);
}

function toBooleanOrDefault(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'sim'].includes(value.toLowerCase());
  }

  return Boolean(value);
}

function sortImagens(imagens) {
  return Array.isArray(imagens) ? [...imagens].sort((a, b) => Number(a.id) - Number(b.id)) : [];
}

function sortMovimentacoes(movimentacoes) {
  return Array.isArray(movimentacoes) ? [...movimentacoes].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) : [];
}

function calcularEstoqueAtual(movimentacoes) {
  return movimentacoes.reduce((total, movimentacao) => {
    const quantidade = Number(movimentacao.quantidade) || 0;
    return movimentacao.tipo === 'entrada' ? total + quantidade : total - quantidade;
  }, 0);
}

function formatarCampoNumerico(campo, scale) {
  if (campo === null || campo === undefined) return null;
  return String(Number(campo).toFixed(scale));
}

function toProdutoPayload(produto) {
  const plain = produto.toJSON ? produto.toJSON() : produto;
  const imagens = sortImagens(plain.imagens);
  const movimentacoes = sortMovimentacoes(plain.movimentacoesEstoque);
  const estoqueAtual = calcularEstoqueAtual(movimentacoes);

  return {
    id: plain.id,
    nome: plain.nome,
    slug: generateSlug(plain.nome),
    descricao: plain.descricao,
    preco_custo: formatarCampoNumerico(plain.preco_custo, 2),
    preco_venda: formatarCampoNumerico(plain.preco_venda, 2),
    peso: formatarCampoNumerico(plain.peso, 3),
    altura: formatarCampoNumerico(plain.altura, 3),
    largura: formatarCampoNumerico(plain.largura, 3),
    profundidade: formatarCampoNumerico(plain.profundidade, 3),
    id_categoria: plain.id_categoria,
    ativo: plain.ativo,
    categoria: plain.categoria
      ? {
          id: plain.categoria.id,
          nome: plain.categoria.nome,
        }
      : null,
    imagens: imagens.map((imagem) => {
      // Normalize image URL: trim and remove any internal whitespace/newlines
      const rawUrl = imagem.url || '';
      let sanitized = String(rawUrl).trim().replace(/\s+/g, '');

      // If it's a Supabase signed URL, convert to the public object URL and remove query params
      // Example signed: https://<project>.supabase.co/storage/v1/object/sign/<bucket>/<path>?token=...
      // Public URL:   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
      try {
        const signMarker = '/storage/v1/object/sign/';
        const publicMarker = '/storage/v1/object/public/';
        if (sanitized.includes(signMarker)) {
          const parts = sanitized.split('?')[0]; // drop token
          sanitized = parts.replace(signMarker, publicMarker);
        }
      } catch (e) {
        // if anything goes wrong, fall back to the sanitized value
      }
      return {
        id: imagem.id,
        url: sanitized,
        criado_em: imagem.criado_em,
      };
    }),
    movimentacoes_estoque: movimentacoes.map((movimentacao) => ({
      id: movimentacao.id,
      tipo: movimentacao.tipo,
      quantidade: movimentacao.quantidade,
      motivo: movimentacao.motivo,
      created_at: movimentacao.created_at,
    })),
    estoque_atual: estoqueAtual,
    criado_em: plain.criado_em,
    atualizado_em: plain.atualizado_em,
  };
}

async function buscarProdutoModelPorId(id) {
  const produto = await db.Produto.findByPk(id, {
    include: [
      {
        model: db.Categoria,
        as: 'categoria',
        attributes: ['id', 'nome'],
      },
      {
        model: db.ProdutoImagem,
        as: 'imagens',
        attributes: ['id', 'url', 'criado_em'],
      },
      {
        model: db.EstoqueMovimentacao,
        as: 'movimentacoesEstoque',
        attributes: ['id', 'tipo', 'quantidade', 'motivo', 'created_at'],
      },
    ],
  });

  if (!produto) {
    throw new AppError(404, 'Produto not found');
  }

  return produto;
}

async function calcularEstoqueProduto(idProduto, transaction) {
  const movimentacoes = await db.EstoqueMovimentacao.findAll({
    where: {
      id_produto: idProduto,
    },
    attributes: ['tipo', 'quantidade'],
    transaction,
  });

  return movimentacoes.reduce((total, movimentacao) => {
    const quantidade = Number(movimentacao.quantidade) || 0;
    return movimentacao.tipo === 'entrada' ? total + quantidade : total - quantidade;
  }, 0);
}

exports.listarProdutos = async (query) => {
  const where = {};

  if (query.ativo !== undefined && query.ativo !== '') {
    where.ativo = toBooleanOrDefault(query.ativo, true);
  }

  if (query.id_categoria !== undefined && query.id_categoria !== '') {
    const idCategoria = Number(query.id_categoria);

    if (!Number.isInteger(idCategoria) || idCategoria <= 0) {
      throw new AppError(400, 'id_categoria must be a valid integer');
    }

    where.id_categoria = idCategoria;
  }

  const produtos = await db.Produto.findAll({
    where,
    include: [
      {
        model: db.Categoria,
        as: 'categoria',
        attributes: ['id', 'nome'],
      },
      {
        model: db.ProdutoImagem,
        as: 'imagens',
        attributes: ['id', 'url', 'criado_em'],
      },
      {
        model: db.EstoqueMovimentacao,
        as: 'movimentacoesEstoque',
        attributes: ['id', 'tipo', 'quantidade', 'motivo', 'created_at'],
      },
    ],
    order: [['id', 'DESC']],
  });

  return produtos.map(toProdutoPayload);
};

exports.buscarProdutoPorId = async (id) => {
  const produto = await buscarProdutoModelPorId(id);
  return toProdutoPayload(produto);
};

exports.buscarProdutoPorNome = async (nome) => {
  // Create slug from the provided name to match against product names
  const slug = generateSlug(nome);
  
  if (!slug) {
    throw new AppError(400, 'Invalid product name');
  }

  // Fetch all products and find the one matching the slug
  // (could be optimized with a database search if product names are indexed)
  const produtos = await db.Produto.findAll({
    include: [
      {
        model: db.Categoria,
        as: 'categoria',
        attributes: ['id', 'nome'],
      },
      {
        model: db.ProdutoImagem,
        as: 'imagens',
        attributes: ['id', 'url', 'criado_em'],
      },
      {
        model: db.EstoqueMovimentacao,
        as: 'movimentacoesEstoque',
        attributes: ['id', 'tipo', 'quantidade', 'motivo', 'created_at'],
      },
    ],
  });

  const produto = produtos.find(p => {
    const productSlug = generateSlug(p.nome);
    return productSlug === slug;
  });

  if (!produto) {
    throw new AppError(404, 'Produto não encontrado');
  }

  return toProdutoPayload(produto);
};

exports.criarProduto = async (payload) => {
  const nome = String(payload.nome || '').trim();
  const descricao = payload.descricao ? String(payload.descricao).trim() : null;
  const precoCusto = formatDecimal(payload.preco_custo, 2);
  const precoVenda = formatDecimal(payload.preco_venda, 2);
  const peso = formatDecimal(payload.peso, 3);
  const altura = formatDecimal(payload.altura, 3);
  const largura = formatDecimal(payload.largura, 3);
  const profundidade = formatDecimal(payload.profundidade, 3);
  
  // se for array de categorias (ex: multi-select no front), pega a primeira
  let idCategoria = payload.id_categoria;
  if (Array.isArray(idCategoria)) {
    idCategoria = parseInt(idCategoria[0], 10);
  } else if (typeof idCategoria === 'string' && idCategoria.includes(',')) {
    idCategoria = parseInt(idCategoria.split(',')[0], 10);
  } else {
    idCategoria = Number(idCategoria);
  }

  const ativo = toBooleanOrDefault(payload.ativo, true);
  const imagens = Array.isArray(payload.imagens) ? payload.imagens : [];

  if (!nome) {
    throw new AppError(400, 'nome is required');
  }

  if (!Number.isInteger(idCategoria) || idCategoria <= 0) {
    throw new AppError(400, 'id_categoria must be a valid integer');
  }

  if (precoCusto === null || precoVenda === null) {
    throw new AppError(400, 'preco_custo and preco_venda are required');
  }

  const categoria = await db.Categoria.findByPk(idCategoria);

  if (!categoria) {
    throw new AppError(404, 'Categoria not found');
  }

  const now = new Date();

  const produto = await db.sequelize.transaction(async (transaction) => {
    const createdProduto = await db.Produto.create(
      {
        nome,
        descricao,
        preco_custo: precoCusto,
        preco_venda: precoVenda,
        peso,
        altura,
        largura,
        profundidade,
        id_categoria: idCategoria,
        ativo,
        criado_em: now,
        atualizado_em: now,
      },
      { transaction }
    );

    const imagensValidadas = imagens
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim();
        }

        if (item && typeof item.url === 'string') {
          return item.url.trim();
        }

        return '';
      })
      .filter(Boolean);

    if (imagensValidadas.length > 0) {
      await db.ProdutoImagem.bulkCreate(
        imagensValidadas.map((url) => ({
          id_produto: createdProduto.id,
          url,
          criado_em: now,
        })),
        { transaction }
      );
    }

    return createdProduto;
  });

  return exports.buscarProdutoPorId(produto.id);
};

exports.adicionarImagem = async (idProduto, payload) => {
  const url = String(payload.url || '').trim();

  if (!url) {
    throw new AppError(400, 'url is required');
  }

  await buscarProdutoModelPorId(idProduto);

  const imagem = await db.ProdutoImagem.create({
    id_produto: idProduto,
    url,
    criado_em: new Date(),
  });

  return {
    id: imagem.id,
    id_produto: imagem.id_produto,
    url: imagem.url,
    criado_em: imagem.criado_em,
  };
};

exports.atualizarProduto = async (idProduto, payload) => {
  const produtoModel = await db.Produto.findByPk(idProduto);

  if (!produtoModel) {
    throw new AppError(404, 'Produto not found');
  }

  const nome = payload.nome !== undefined ? String(payload.nome || '').trim() : produtoModel.nome;
  const descricao = payload.descricao !== undefined ? (payload.descricao ? String(payload.descricao).trim() : null) : produtoModel.descricao;
  const precoCusto = payload.preco_custo !== undefined ? formatDecimal(payload.preco_custo, 2) : produtoModel.preco_custo;
  const precoVenda = payload.preco_venda !== undefined ? formatDecimal(payload.preco_venda, 2) : produtoModel.preco_venda;
  const peso = payload.peso !== undefined ? formatDecimal(payload.peso, 3) : produtoModel.peso;
  const altura = payload.altura !== undefined ? formatDecimal(payload.altura, 3) : produtoModel.altura;
  const largura = payload.largura !== undefined ? formatDecimal(payload.largura, 3) : produtoModel.largura;
  const profundidade = payload.profundidade !== undefined ? formatDecimal(payload.profundidade, 3) : produtoModel.profundidade;

  let idCategoria = payload.id_categoria !== undefined ? payload.id_categoria : produtoModel.id_categoria;
  if (Array.isArray(idCategoria)) {
    idCategoria = parseInt(idCategoria[0], 10);
  } else if (typeof idCategoria === 'string' && idCategoria.includes(',')) {
    idCategoria = parseInt(idCategoria.split(',')[0], 10);
  } else {
    idCategoria = Number(idCategoria);
  }

  const ativo = payload.ativo !== undefined ? toBooleanOrDefault(payload.ativo, produtoModel.ativo) : produtoModel.ativo;
  const imagens = Array.isArray(payload.imagens) ? payload.imagens : (payload.imagens ? [payload.imagens] : []);

  if (!nome) {
    throw new AppError(400, 'nome is required');
  }

  if (!Number.isInteger(idCategoria) || idCategoria <= 0) {
    throw new AppError(400, 'id_categoria must be a valid integer');
  }

  const categoria = await db.Categoria.findByPk(idCategoria);
  if (!categoria) throw new AppError(404, 'Categoria not found');

  const now = new Date();

  const updated = await db.sequelize.transaction(async (transaction) => {
    await produtoModel.update({
      nome,
      descricao,
      preco_custo: precoCusto,
      preco_venda: precoVenda,
      peso,
      altura,
      largura,
      profundidade,
      id_categoria: idCategoria,
      ativo,
      atualizado_em: now,
    }, { transaction });

    if (imagens && imagens.length > 0) {
      // replace existing images with new ones
      await db.ProdutoImagem.destroy({ where: { id_produto: produtoModel.id }, transaction });
      await db.ProdutoImagem.bulkCreate(imagens.map(url => ({ id_produto: produtoModel.id, url, criado_em: now })), { transaction });
    }

    return produtoModel;
  });

  return exports.buscarProdutoPorId(updated.id);
};

exports.registrarMovimentacao = async (idProduto, payload) => {
  const tipo = String(payload.tipo || '').trim().toLowerCase();
  const motivo = String(payload.motivo || '').trim().toLowerCase();
  const quantidade = Number(payload.quantidade);

  if (!ALLOWED_MOVEMENT_TYPES.has(tipo)) {
    throw new AppError(400, 'tipo must be "entrada" or "saida"');
  }

  if (!ALLOWED_MOVEMENT_REASONS.has(motivo)) {
    throw new AppError(400, 'motivo must be "compra", "venda" or "ajuste"');
  }

  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new AppError(400, 'quantidade must be a positive integer');
  }

  const produto = await buscarProdutoModelPorId(idProduto);
  const estoqueAtual = await calcularEstoqueProduto(produto.id);

  if (tipo === 'saida' && quantidade > estoqueAtual) {
    throw new AppError(400, 'insufficient stock for this movement');
  }

  const movimentacao = await db.EstoqueMovimentacao.create({
    id_produto: produto.id,
    tipo,
    quantidade,
    motivo,
    created_at: new Date(),
  });

  return {
    id: movimentacao.id,
    id_produto: movimentacao.id_produto,
    tipo: movimentacao.tipo,
    quantidade: movimentacao.quantidade,
    motivo: movimentacao.motivo,
    created_at: movimentacao.created_at,
    estoque_atual: tipo === 'entrada' ? estoqueAtual + quantidade : estoqueAtual - quantidade,
  };
};

exports.registrarMovimentacoesEmMassa = async (payload) => {
  const received = payload;
  const movimentacoesInput = Array.isArray(received)
    ? received
    : (received && Array.isArray(received.movimentacoes) ? received.movimentacoes : null);

  if (!movimentacoesInput || !Array.isArray(movimentacoesInput) || movimentacoesInput.length === 0) {
    throw new AppError(400, 'movimentacoes is required and should be a non-empty array');
  }

  const movimentacoes = movimentacoesInput.map((m) => ({
    id_produto: Number(m.id_produto),
    tipo: String(m.tipo || '').trim().toLowerCase(),
    quantidade: Number(m.quantidade),
    motivo: String(m.motivo || '').trim().toLowerCase(),
    created_at: m.created_at ? new Date(m.created_at) : new Date(),
  }));

  // Basic validation
  for (const m of movimentacoes) {
    if (!Number.isInteger(m.id_produto) || m.id_produto <= 0) {
      throw new AppError(400, 'each movimentacao must have a valid id_produto');
    }
    if (!ALLOWED_MOVEMENT_TYPES.has(m.tipo)) {
      throw new AppError(400, 'tipo must be "entrada" or "saida"');
    }
    if (!ALLOWED_MOVEMENT_REASONS.has(m.motivo)) {
      throw new AppError(400, 'motivo must be "compra", "venda" or "ajuste"');
    }
    if (!Number.isInteger(m.quantidade) || m.quantidade <= 0) {
      throw new AppError(400, 'quantidade must be a positive integer');
    }
  }

  // Run in transaction and ensure products exist and do not allow negative stock on 'saida'
  const results = [];

  await db.sequelize.transaction(async (transaction) => {
    for (const m of movimentacoes) {
      const produto = await db.Produto.findByPk(m.id_produto, { transaction });
      if (!produto) {
        throw new AppError(404, `Produto not found: ${m.id_produto}`);
      }

      const estoqueAtual = await calcularEstoqueProduto(produto.id, transaction);

      if (m.tipo === 'saida' && m.quantidade > estoqueAtual) {
        throw new AppError(400, `insufficient stock for product ${m.id_produto}`);
      }

      const created = await db.EstoqueMovimentacao.create(
        {
          id_produto: m.id_produto,
          tipo: m.tipo,
          quantidade: m.quantidade,
          motivo: m.motivo,
          created_at: m.created_at,
        },
        { transaction }
      );

      results.push({ id: created.id, id_produto: created.id_produto, tipo: created.tipo, quantidade: created.quantidade, motivo: created.motivo, created_at: created.created_at });
    }
  });

  return { inserted: results.length, items: results };
};
