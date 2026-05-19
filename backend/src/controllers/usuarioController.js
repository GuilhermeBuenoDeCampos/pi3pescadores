const asyncHandler = require('../utils/asyncHandler');
const usuarioService = require('../services/usuarioService');

exports.cadastrar = asyncHandler(async (req, res) => {
  const usuario = await usuarioService.criarUsuario({
    ...req.body,
    tipo_usuario: 'cliente',
  });

  res.status(201).json({
    data: usuario,
  });
});

exports.login = asyncHandler(async (req, res) => {
  const session = await usuarioService.autenticarUsuario(req.body);

  res.json({
    data: session,
  });
});

exports.listar = asyncHandler(async (req, res) => {
  const usuarios = await usuarioService.listarUsuarios(req.query);

  res.json({
    data: usuarios,
  });
});

exports.detalhar = asyncHandler(async (req, res) => {
  const usuario = await usuarioService.buscarUsuarioPorId(req.params.id);

  res.json({
    data: usuario,
  });
});

exports.criar = asyncHandler(async (req, res) => {
  const usuario = await usuarioService.criarUsuario(req.body);

  res.status(201).json({
    data: usuario,
  });
});

exports.atualizar = asyncHandler(async (req, res) => {
  const usuario = await usuarioService.atualizarUsuario(req.params.id, req.body);

  res.json({
    data: usuario,
  });
});

exports.excluir = asyncHandler(async (req, res) => {
  const usuario = await usuarioService.excluirUsuario(req.params.id);

  res.json({ data: usuario });
});
