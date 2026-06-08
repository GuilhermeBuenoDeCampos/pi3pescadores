const asyncHandler = require('../utils/asyncHandler');
const carrinhoService = require('../services/carrinhoService');

function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function getContext(req) {
  return {
    userId: req.user?.sub || null,
    guestToken: req.headers['x-guest-token'] || req.body?.guest_token || null,
  };
}

exports.obter = asyncHandler(async (req, res) => {
  const cart = await carrinhoService.obterCarrinhoAtivo(getContext(req));

  res.json({ data: cart });
});

exports.adicionarItem = asyncHandler(async (req, res) => {
  const produtoId = parsePositiveInteger(req.body.produto_id);
  const quantidade = parsePositiveInteger(req.body.quantidade || 1);

  if (!produtoId) {
    return res.status(400).json({ error: { message: 'produto_id must be a valid integer' } });
  }

  if (!quantidade) {
    return res.status(400).json({ error: { message: 'quantidade must be a positive integer' } });
  }

  const cart = await carrinhoService.adicionarItem({
    ...getContext(req),
    produtoId,
    quantidade,
  });

  res.status(201).json({ data: cart });
});

exports.atualizarItem = asyncHandler(async (req, res) => {
  const itemId = parsePositiveInteger(req.params.id);
  const quantidade = Number(req.body.quantidade);

  if (!itemId) {
    return res.status(400).json({ error: { message: 'item_id must be a valid integer' } });
  }

  if (!Number.isInteger(quantidade) || quantidade < 0) {
    return res.status(400).json({ error: { message: 'quantidade must be a non-negative integer' } });
  }

  const cart = await carrinhoService.atualizarItem({
    ...getContext(req),
    itemId,
    quantidade,
  });

  res.json({ data: cart });
});

exports.removerItem = asyncHandler(async (req, res) => {
  const itemId = parsePositiveInteger(req.params.id);

  if (!itemId) {
    return res.status(400).json({ error: { message: 'item_id must be a valid integer' } });
  }

  const cart = await carrinhoService.removerItem({
    ...getContext(req),
    itemId,
  });

  res.json({ data: cart });
});
