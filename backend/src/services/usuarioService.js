const crypto = require('crypto');
const { Op } = require('sequelize');
const db = require('../database/models');
const AppError = require('../middlewares/appError');
const jwt = require('../utils/jwt');
const carrinhoService = require('./carrinhoService');

const TIPOS_USUARIO = new Set(['admin', 'cliente', 'funcionario']);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function formatCpf(value) {
  const digits = onlyDigits(value);

  if (digits.length !== 11) {
    return null;
  }

  return digits;
}

function formatCpfComPontuacao(value) {
  const digits = onlyDigits(value);

  if (digits.length !== 11) {
    return null;
  }

  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function toUsuarioPayload(usuario) {
  const plain = usuario.toJSON ? usuario.toJSON() : usuario;

  return {
    id: plain.id,
    nome: plain.nome,
    email: plain.email,
    telefone: plain.telefone,
    tipo_usuario: plain.tipo_usuario,
    cpf: plain.cpf,
    ativo: plain.ativo,
    created_at: plain.created_at,
    updated_at: plain.updated_at,
    ultimo_login_em: plain.ultimo_login_em,
  };
}

function hashSenha(senha) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(12).toString('base64url');

    crypto.scrypt(String(senha), salt, 32, (error, derivedKey) => {
      if (error) {
        return reject(error);
      }

      return resolve(`scrypt:${salt}:${derivedKey.toString('base64url')}`);
    });
  });
}

function verificarSenha(senha, senhaHash) {
  return new Promise((resolve, reject) => {
    const [algorithm, salt, storedKey] = String(senhaHash || '').split(':');

    if (algorithm !== 'scrypt' || !salt || !storedKey) {
      return resolve(false);
    }

    const isHexKey = /^[0-9a-f]+$/i.test(storedKey) && storedKey.length % 2 === 0;
    const storedBuffer = isHexKey
      ? Buffer.from(storedKey, 'hex')
      : Buffer.from(storedKey, 'base64url');

    crypto.scrypt(String(senha), salt, storedBuffer.length, (error, derivedKey) => {
      if (error) {
        return reject(error);
      }

      if (storedBuffer.length !== derivedKey.length) {
        return resolve(false);
      }

      return resolve(crypto.timingSafeEqual(storedBuffer, derivedKey));
    });
  });
}

exports.criarUsuario = async (payload) => {
  const nome = String(payload.nome || '').trim();
  const email = normalizeEmail(payload.email);
  const telefone = payload.telefone ? String(payload.telefone).trim() : null;
  const cpf = formatCpf(payload.cpf);
  const cpfDigits = onlyDigits(payload.cpf);
  const senha = String(payload.senha || '');
  const tipoUsuario = String(payload.tipo_usuario || 'cliente').trim().toLowerCase();

  if (!nome) {
    throw new AppError(400, 'nome is required');
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new AppError(400, 'email must be valid');
  }

  if (!cpf) {
    throw new AppError(400, 'cpf must have 11 digits');
  }

  if (senha.length < 6) {
    throw new AppError(400, 'senha must have at least 6 characters');
  }

  if (!TIPOS_USUARIO.has(tipoUsuario)) {
    throw new AppError(400, 'tipo_usuario must be admin, cliente or funcionario');
  }

  const usuarioExistente = await db.Usuario.findOne({
    where: {
      [Op.or]: [{ email }, { cpf }, { cpf: cpfDigits }, { cpf: formatCpfComPontuacao(cpfDigits) }],
    },
  });

  if (usuarioExistente) {
    throw new AppError(409, 'email or cpf already registered');
  }

  const now = new Date();
  const senhaHash = await hashSenha(senha);

  const usuario = await db.Usuario.create({
    nome,
    email,
    telefone,
    tipo_usuario: tipoUsuario,
    cpf,
    created_at: now,
    updated_at: now,
    senha_hash: senhaHash,
    ativo: true,
    ultimo_login_em: null,
  });

  return toUsuarioPayload(usuario);
};

exports.autenticarUsuario = async (payload) => {
  const email = normalizeEmail(payload.email);
  const senha = String(payload.senha || '');

  if (!EMAIL_REGEX.test(email) || !senha) {
    throw new AppError(401, 'email or password is invalid');
  }

  const usuario = await db.Usuario.findOne({
    where: { email },
  });

  if (!usuario) {
    throw new AppError(401, 'email or password is invalid');
  }

  if (!usuario.ativo) {
    throw new AppError(403, 'user is inactive');
  }

  const senhaValida = await verificarSenha(senha, usuario.senha_hash);

  if (!senhaValida) {
    throw new AppError(401, 'email or password is invalid');
  }

  const now = new Date();
  await usuario.update({
    ultimo_login_em: now,
    updated_at: now,
  });

  const usuarioPayload = toUsuarioPayload({
    ...usuario.toJSON(),
    ultimo_login_em: now,
    updated_at: now,
  });

  const token = jwt.sign({
    sub: usuario.id,
    email: usuario.email,
    tipo_usuario: usuario.tipo_usuario,
  });

  let carrinho = null;

  if (payload.guest_token) {
    carrinho = await carrinhoService.associarCarrinhoGuestAoUsuario({
      guestToken: payload.guest_token,
      userId: usuario.id,
    });
  }

  return {
    token,
    usuario: usuarioPayload,
    carrinho,
  };
};
