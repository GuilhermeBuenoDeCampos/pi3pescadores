const asyncHandler = require('../utils/asyncHandler');
const enderecoService = require('../services/enderecoService');

function getUsuarioId(req) {
  return req.user?.id || req.user?.sub;
}

exports.listar = asyncHandler(async (req, res) => {
  const enderecos = await enderecoService.listarEnderecos(getUsuarioId(req));

  res.json({
    data: enderecos,
  });
});

exports.criar = asyncHandler(async (req, res) => {
  const endereco = await enderecoService.criarEndereco(getUsuarioId(req), req.body);

  res.status(201).json({
    data: endereco,
  });
});

exports.atualizar = asyncHandler(async (req, res) => {
  const endereco = await enderecoService.atualizarEndereco(getUsuarioId(req), req.params.id, req.body);

  res.json({
    data: endereco,
  });
});

exports.excluir = asyncHandler(async (req, res) => {
  const resultado = await enderecoService.excluirEndereco(getUsuarioId(req), req.params.id);

  res.json({
    data: resultado,
  });
});

exports.definirPrincipal = asyncHandler(async (req, res) => {
  const endereco = await enderecoService.definirEnderecoPrincipal(getUsuarioId(req), req.params.id);

  res.json({
    data: endereco,
  });
});
