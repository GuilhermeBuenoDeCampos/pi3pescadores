const asyncHandler = require('../utils/asyncHandler');
const produtoService = require('../services/produtoService');
const uploadService = require('../services/uploadService');

function parseId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

exports.listar = asyncHandler(async (req, res) => {
  const produtos = await produtoService.listarProdutos(req.query);

  res.json({
    data: produtos,
  });
});

exports.detalhar = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: { message: 'Invalid produto id' },
    });
  }

  const produto = await produtoService.buscarProdutoPorId(id);

  res.json({
    data: produto,
  });
});

exports.detalharPorNome = asyncHandler(async (req, res) => {
  const nome = req.params.nome;

  if (!nome || typeof nome !== 'string' || nome.trim().length === 0) {
    return res.status(400).json({
      error: { message: 'Invalid product name' },
    });
  }

  const produto = await produtoService.buscarProdutoPorNome(nome);

  res.json({
    data: produto,
  });
});

exports.criar = asyncHandler(async (req, res) => {
  const files = req.files || [];
  const fileUrls = await uploadService.uploadMultipleFiles(files);

  const payload = {
    ...req.body,
    imagens: fileUrls
  };

  const produto = await produtoService.criarProduto(payload);

  res.status(201).json({
    data: produto,
  });
});

exports.adicionarImagem = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: { message: 'Invalid produto id' },
    });
  }

  const imagem = await produtoService.adicionarImagem(id, req.body);

  res.status(201).json({
    data: imagem,
  });
});

exports.registrarMovimentacao = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: { message: 'Invalid produto id' },
    });
  }

  const movimentacao = await produtoService.registrarMovimentacao(id, req.body);

  res.status(201).json({
    data: movimentacao,
  });
});

function parseMovimentacoesPayload(payload) {
  let parsed = payload;

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch (e) {
      // leave as-is; service will validate
    }
  }

  if (parsed && typeof parsed.movimentacoes === 'string') {
    try {
      parsed.movimentacoes = JSON.parse(parsed.movimentacoes);
    } catch (e) {
      // leave as-is; service will validate
    }
  }

  return parsed;
}

exports.registrarMovimentacoesEmMassa = asyncHandler(async (req, res) => {
  const payload = parseMovimentacoesPayload(req.body);
  const result = await produtoService.registrarMovimentacoesEmMassa(payload);

  res.status(201).json({
    data: result,
  });
});

exports.atualizar = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: { message: 'Invalid produto id' } });
  }

  // Files handled by multer are normalized in local storage and converted to public URLs.
  const files = req.files || [];
  const fileUrls = await uploadService.uploadMultipleFiles(files);
  const payload = { ...req.body, imagens: fileUrls };

  const updated = await produtoService.atualizarProduto(id, payload);

  res.json({ data: updated });
});
