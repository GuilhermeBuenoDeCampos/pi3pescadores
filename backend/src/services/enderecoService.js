'use strict';

const { Op, fn, col, where } = require('sequelize');
const db = require('../database/models');
const AppError = require('../middlewares/appError');

function normalizeText(value) {
  return String(value || '').trim();
}

function stripDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeStateKey(value) {
  return normalizeText(value).toUpperCase();
}

function toEstadoPayload(estado) {
  if (!estado) {
    return null;
  }

  const plain = estado.toJSON ? estado.toJSON() : estado;

  return {
    id: plain.id,
    nome: plain.nome,
    sigla: plain.uf,
    uf: plain.uf,
  };
}

function toCidadePayload(cidade) {
  if (!cidade) {
    return null;
  }

  const plain = cidade.toJSON ? cidade.toJSON() : cidade;

  return {
    id: plain.id,
    nome: plain.nome,
    estado_id: plain.estado_id,
    estado: toEstadoPayload(plain.estado),
    created_at: plain.created_at,
    updated_at: plain.updated_at,
  };
}

function toEnderecoPayload(endereco) {
  const plain = endereco.toJSON ? endereco.toJSON() : endereco;
  const cidade = toCidadePayload(plain.cidade);
  const estado = plain.estado ? toEstadoPayload(plain.estado) : cidade?.estado || null;

  return {
    id: plain.id,
    usuario_id: plain.usuario_id,
    cidade_id: plain.cidade_id,
    cep: plain.cep,
    logradouro: plain.logradouro,
    numero: plain.numero,
    complemento: plain.complemento,
    bairro: plain.bairro,
    apelido: plain.apelido,
    principal: Boolean(plain.principal),
    cidade,
    estado,
    created_at: plain.created_at,
    updated_at: plain.updated_at,
  };
}

function buildEnderecoInclude() {
  return [
    {
      model: db.Cidade,
      as: 'cidade',
      include: [
        {
          model: db.Estado,
          as: 'estado',
        },
      ],
    },
  ];
}

function ensureEnderecoUsuarioModel() {
  if (!db.EnderecoUsuario) {
    throw new AppError(500, 'Model EnderecoUsuario não registrado');
  }

  if (db.EnderecoUsuario.tableName !== 'enderecos_usuario') {
    throw new AppError(500, 'Model EnderecoUsuario configurado com tabela incorreta');
  }
}

function getCurrentUserId(userId) {
  const normalized = normalizeText(userId);

  if (!normalized) {
    throw new AppError(401, 'Authentication token is required');
  }

  return normalized;
}

function normalizeAddressInput(payload, current = null) {
  const cep = stripDigits(payload.cep ?? current?.cep);
  const logradouro = normalizeText(payload.logradouro ?? current?.logradouro);
  const numero = normalizeText(payload.numero ?? current?.numero);
  const complemento = normalizeText(payload.complemento ?? current?.complemento);
  const bairro = normalizeText(payload.bairro ?? current?.bairro);
  const apelido = normalizeText(payload.apelido ?? current?.apelido);

  if (!cep) {
    throw new AppError(400, 'CEP é obrigatório');
  }

  if (cep.length !== 8) {
    throw new AppError(400, 'CEP deve conter 8 dígitos');
  }

  if (!logradouro) {
    throw new AppError(400, 'Logradouro é obrigatório');
  }

  if (!numero) {
    throw new AppError(400, 'Número é obrigatório');
  }

  if (!bairro) {
    throw new AppError(400, 'Bairro é obrigatório');
  }

  return {
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    apelido: apelido || current?.apelido || 'Endereço',
    principal: Boolean(payload.principal),
    estadoId: payload.estado_id ?? payload.estadoId ?? current?.estado_id ?? null,
    estadoSigla: normalizeStateKey(payload.estado_sigla ?? payload.uf ?? payload.estadoSigla ?? ''),
    estadoNome: normalizeText(payload.estado_nome ?? payload.estadoNome ?? payload.estado ?? ''),
    cidadeId: payload.cidade_id ?? payload.cidadeId ?? current?.cidade_id ?? null,
    cidadeNome: normalizeText(payload.cidade_nome ?? payload.cidadeNome ?? payload.cidade ?? current?.cidade?.nome ?? ''),
  };
}

async function findEstadoByText(transaction, input) {
  if (!input) {
    return null;
  }

  const upper = normalizeStateKey(input);
  const lower = input.toLowerCase();

  return db.Estado.findOne({
    where: {
      [Op.or]: [
        { uf: upper },
        where(fn('lower', col('nome')), lower),
      ],
    },
    transaction,
  });
}

async function resolveEstado(transaction, input) {
  if (input.estadoId) {
    const estado = await db.Estado.findByPk(input.estadoId, { transaction });

    if (!estado) {
      throw new AppError(404, 'Estado não encontrado');
    }

    return estado;
  }

  const preferredText = input.estadoSigla || input.estadoNome;
  let estado = await findEstadoByText(transaction, preferredText);

  if (!estado && input.estadoSigla && input.estadoNome && input.estadoSigla !== input.estadoNome) {
    estado = await findEstadoByText(transaction, input.estadoSigla);
    if (estado && normalizeText(estado.nome).toLowerCase() !== input.estadoNome.toLowerCase()) {
      await estado.update(
        {
          nome: input.estadoNome,
          updated_at: new Date(),
        },
        { transaction }
      );
    }
  }

  if (!estado) {
    const sigla = input.estadoSigla || (input.estadoNome.length === 2 ? input.estadoNome.toUpperCase() : '');
    const nome = input.estadoNome || sigla;

    if (!sigla && !nome) {
      throw new AppError(400, 'Estado é obrigatório');
    }

    estado = await db.Estado.create(
      {
        uf: sigla || nome.slice(0, 2).toUpperCase(),
        nome,
      },
      { transaction }
    );
  } else if (input.estadoSigla && estado.uf !== input.estadoSigla) {
    await estado.update(
      {
        uf: input.estadoSigla,
      },
      { transaction }
    );
  }

  return estado;
}

async function resolveCidade(transaction, input, estado) {
  if (input.cidadeId) {
    const cidade = await db.Cidade.findOne({
      where: {
        id: input.cidadeId,
      },
      include: [{ model: db.Estado, as: 'estado' }],
      transaction,
    });

    if (!cidade) {
      throw new AppError(404, 'Cidade não encontrada');
    }

    if (estado && cidade.estado_id !== estado.id) {
      throw new AppError(400, 'A cidade informada não pertence ao estado selecionado');
    }

    return cidade;
  }

  if (!input.cidadeNome) {
    throw new AppError(400, 'Cidade é obrigatória');
  }

  const matchingCities = await db.Cidade.findAll({
    where: where(fn('lower', col('Cidade.nome')), input.cidadeNome.toLowerCase()),
    include: [{ model: db.Estado, as: 'estado' }],
    transaction,
  });

  let cidade = null;

  if (estado) {
    cidade = matchingCities.find((item) => item.estado_id === estado.id) || null;

    if (!cidade) {
      cidade = await db.Cidade.create(
        {
          nome: input.cidadeNome,
          estado_id: estado.id,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction }
      );
    }
  } else {
    if (matchingCities.length > 1) {
      throw new AppError(400, 'Informe o estado para identificar a cidade corretamente');
    }

    cidade = matchingCities[0] || null;

    if (!cidade) {
      throw new AppError(400, 'Informe o estado para cadastrar uma nova cidade');
    }
  }

  return cidade;
}

async function resolveGeography(transaction, input, current = null) {
  const hasStateInput = Boolean(
    input.estadoId ||
    input.estadoSigla ||
    input.estadoNome
  );

  let estado = null;

  if (hasStateInput) {
    estado = await resolveEstado(transaction, input);
  }

  const cidade = await resolveCidade(transaction, input, estado || current?.cidade?.estado || null);

  if (!estado) {
    estado = cidade.estado || null;
  }

  if (estado && cidade.estado_id !== estado.id) {
    throw new AppError(400, 'A cidade informada não pertence ao estado selecionado');
  }

  return { estado, cidade };
}

async function fetchEnderecoCompleto(usuarioId, enderecoId, transaction) {
  const endereco = await db.EnderecoUsuario.findOne({
    where: {
      id: enderecoId,
      usuario_id: usuarioId,
    },
    include: buildEnderecoInclude(),
    transaction,
  });

  if (!endereco) {
    throw new AppError(404, 'Endereço não encontrado');
  }

  return toEnderecoPayload(endereco);
}

async function clearPrincipalEndereco(usuarioId, transaction, excludeId = null) {
  await db.EnderecoUsuario.update(
    {
      principal: false,
      updated_at: new Date(),
    },
    {
      where: {
        usuario_id: usuarioId,
        ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
      },
      transaction,
    }
  );
}

async function promoteFirstEndereco(usuarioId, transaction) {
  const endereco = await db.EnderecoUsuario.findOne({
    where: {
      usuario_id: usuarioId,
    },
    include: buildEnderecoInclude(),
    order: [
      ['created_at', 'ASC'],
      ['id', 'ASC'],
    ],
    transaction,
  });

  if (!endereco) {
    return null;
  }

  await endereco.update(
    {
      principal: true,
      updated_at: new Date(),
    },
    { transaction }
  );

  return fetchEnderecoCompleto(usuarioId, endereco.id, transaction);
}

exports.listarEnderecos = async (usuarioId) => {
  const ownerId = getCurrentUserId(usuarioId);

  const enderecos = await db.EnderecoUsuario.findAll({
    where: {
      usuario_id: ownerId,
    },
    include: buildEnderecoInclude(),
    order: [
      ['principal', 'DESC'],
      ['created_at', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  return enderecos.map(toEnderecoPayload);
};

exports.criarEndereco = async (usuarioId, payload) => {
  const ownerId = getCurrentUserId(usuarioId);

  return db.sequelize.transaction(async (transaction) => {
    const input = normalizeAddressInput(payload);
    const totalEnderecos = await db.EnderecoUsuario.count({
      where: {
        usuario_id: ownerId,
      },
      transaction,
    });

    const geography = await resolveGeography(transaction, input);
    const shouldBePrincipal = input.principal || totalEnderecos === 0;

    if (shouldBePrincipal) {
      await clearPrincipalEndereco(ownerId, transaction);
    }

    const endereco = await db.EnderecoUsuario.create(
      {
        usuario_id: ownerId,
        cidade_id: geography.cidade.id,
        cep: input.cep,
        logradouro: input.logradouro,
        numero: input.numero,
        complemento: input.complemento || null,
        bairro: input.bairro,
        apelido: input.apelido,
        principal: shouldBePrincipal,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction }
    );

    return fetchEnderecoCompleto(ownerId, endereco.id, transaction);
  });
};

exports.atualizarEndereco = async (usuarioId, enderecoId, payload) => {
  const ownerId = getCurrentUserId(usuarioId);

  return db.sequelize.transaction(async (transaction) => {
    const endereco = await db.EnderecoUsuario.findOne({
      where: {
        id: enderecoId,
        usuario_id: ownerId,
      },
      include: buildEnderecoInclude(),
      transaction,
    });

    if (!endereco) {
      throw new AppError(404, 'Endereço não encontrado');
    }

    const current = toEnderecoPayload(endereco);
    const input = normalizeAddressInput(payload, current);
    const geography = await resolveGeography(transaction, input, current);

    if (input.principal) {
      await clearPrincipalEndereco(ownerId, transaction, endereco.id);
    }

    await endereco.update(
      {
        cidade_id: geography.cidade.id,
        cep: input.cep,
        logradouro: input.logradouro,
        numero: input.numero,
        complemento: input.complemento || null,
        bairro: input.bairro,
        apelido: input.apelido,
        principal: Boolean(input.principal) || Boolean(endereco.principal),
        updated_at: new Date(),
      },
      { transaction }
    );

    if (input.principal) {
      await clearPrincipalEndereco(ownerId, transaction, endereco.id);
      await endereco.update(
        {
          principal: true,
          updated_at: new Date(),
        },
        { transaction }
      );
    }

    return fetchEnderecoCompleto(ownerId, endereco.id, transaction);
  });
};

exports.excluirEndereco = async (usuarioId, enderecoId) => {
  const ownerId = getCurrentUserId(usuarioId);

  return db.sequelize.transaction(async (transaction) => {
    const endereco = await db.EnderecoUsuario.findOne({
      where: {
        id: enderecoId,
        usuario_id: ownerId,
      },
      include: buildEnderecoInclude(),
      transaction,
    });

    if (!endereco) {
      throw new AppError(404, 'Endereço não encontrado');
    }

    const eraPrincipal = Boolean(endereco.principal);

    await endereco.destroy({ transaction });

    if (eraPrincipal) {
      return promoteFirstEndereco(ownerId, transaction);
    }

    return {
      id: endereco.id,
      removido: true,
    };
  });
};

exports.definirEnderecoPrincipal = async (usuarioId, enderecoId) => {
  const ownerId = getCurrentUserId(usuarioId);

  return db.sequelize.transaction(async (transaction) => {
    const endereco = await db.EnderecoUsuario.findOne({
      where: {
        id: enderecoId,
        usuario_id: ownerId,
      },
      include: buildEnderecoInclude(),
      transaction,
    });

    if (!endereco) {
      throw new AppError(404, 'Endereço não encontrado');
    }

    await clearPrincipalEndereco(ownerId, transaction, endereco.id);

    await endereco.update(
      {
        principal: true,
        updated_at: new Date(),
      },
      { transaction }
    );

    return fetchEnderecoCompleto(ownerId, endereco.id, transaction);
  });
};

Object.keys(exports).forEach((operation) => {
  const handler = exports[operation];

  exports[operation] = async (...args) => {
    try {
      ensureEnderecoUsuarioModel();
      return await handler(...args);
    } catch (error) {
      throw error;
    }
  };
});
