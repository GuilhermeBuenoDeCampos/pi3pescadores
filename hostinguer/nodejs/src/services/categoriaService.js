const db = require('../database/models');
const AppError = require('../middlewares/appError');

function toCategoriaPayload(categoria) {
  const plain = categoria.toJSON ? categoria.toJSON() : categoria;
  const subcategorias = Array.isArray(plain.subcategorias)
    ? [...plain.subcategorias].sort((a, b) => a.nome.localeCompare(b.nome))
    : [];
  const produtos = Array.isArray(plain.produtos)
    ? [...plain.produtos].sort((a, b) => a.nome.localeCompare(b.nome))
    : [];

  return {
    id: plain.id,
    nome: plain.nome,
    descricao: plain.descricao,
    id_categoria_pai: plain.id_categoria_pai,
    categoria_pai: plain.categoriaPai
      ? {
          id: plain.categoriaPai.id,
          nome: plain.categoriaPai.nome,
        }
      : null,
    subcategorias: subcategorias.map((subcategoria) => ({
      id: subcategoria.id,
      nome: subcategoria.nome,
      descricao: subcategoria.descricao,
      id_categoria_pai: subcategoria.id_categoria_pai,
    })),
    produtos: produtos.map((produto) => ({
      id: produto.id,
      nome: produto.nome,
      ativo: produto.ativo,
    })),
    criado_em: plain.criado_em,
    atualizado_em: plain.atualizado_em,
  };
}

async function buscarCategoriaModelPorId(id) {
  const categoria = await db.Categoria.findByPk(id, {
    include: [
      {
        model: db.Categoria,
        as: 'categoriaPai',
        attributes: ['id', 'nome'],
      },
      {
        model: db.Categoria,
        as: 'subcategorias',
        attributes: ['id', 'nome', 'descricao', 'id_categoria_pai'],
      },
      {
        model: db.Produto,
        as: 'produtos',
        attributes: ['id', 'nome', 'ativo'],
      },
    ],
  });

  if (!categoria) {
    throw new AppError(404, 'Categoria not found');
  }

  return categoria;
}

exports.listarCategorias = async () => {
  const categorias = await db.Categoria.findAll({
    include: [
      {
        model: db.Categoria,
        as: 'categoriaPai',
        attributes: ['id', 'nome'],
      },
      {
        model: db.Categoria,
        as: 'subcategorias',
        attributes: ['id', 'nome', 'descricao', 'id_categoria_pai'],
      },
    ],
    order: [['nome', 'ASC']],
  });

  return categorias.map(toCategoriaPayload);
};

exports.buscarCategoriaPorId = async (id) => {
  const categoria = await buscarCategoriaModelPorId(id);
  return toCategoriaPayload(categoria);
};

exports.criarCategoria = async (payload) => {
  const nome = String(payload.nome || '').trim();
  const descricao = payload.descricao ? String(payload.descricao).trim() : null;
  const rawIdCategoriaPai = payload.id_categoria_pai;
  const idCategoriaPai =
    rawIdCategoriaPai === undefined || rawIdCategoriaPai === null || rawIdCategoriaPai === ''
      ? null
      : Number(rawIdCategoriaPai);

  if (!nome) {
    throw new AppError(400, 'nome is required');
  }

  if (idCategoriaPai !== null && (!Number.isInteger(idCategoriaPai) || idCategoriaPai <= 0)) {
    throw new AppError(400, 'id_categoria_pai must be a valid integer');
  }

  if (idCategoriaPai !== null) {
    await buscarCategoriaModelPorId(idCategoriaPai);
  }

  const now = new Date();

  const categoria = await db.Categoria.create({
    nome,
    descricao,
    id_categoria_pai: idCategoriaPai,
    criado_em: now,
    atualizado_em: now,
  });

  return exports.buscarCategoriaPorId(categoria.id);
};
