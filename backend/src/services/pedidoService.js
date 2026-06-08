'use strict';

const { Op } = require('sequelize');
const db = require('../database/models');
const AppError = require('../middlewares/appError');
const leadtimeService = require('./leadtimeService');

const ORDER_STATUSES = new Set(['pendente', 'confirmado', 'preparando', 'enviado', 'concluido', 'cancelado']);
const PAYMENT_METHODS = new Set(['whatsapp', 'pix', 'cartao', 'dinheiro', 'boleto', 'outro']);
const SALE_STATUSES = ['preparando', 'enviado', 'confirmado', 'concluido'];

function toMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

function formatMoney(value) {
  return toMoney(value).toFixed(2);
}

function normalizeImageUrl(url) {
  const rawUrl = String(url || '').trim().replace(/\s+/g, '');
  const signMarker = '/storage/v1/object/sign/';
  const publicMarker = '/storage/v1/object/public/';

  if (rawUrl.includes(signMarker)) {
    return rawUrl.split('?')[0].replace(signMarker, publicMarker);
  }

  return rawUrl;
}

function getUserId(user) {
  return user?.sub || user?.id || null;
}

function normalizePaymentMethod(value) {
  const method = String(value || '').trim().toLowerCase();
  return PAYMENT_METHODS.has(method) ? method : 'whatsapp';
}

function getLikeOperator() {
  return db.sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
}

function normalizeAddress(address) {
  if (!address || typeof address !== 'object' || Array.isArray(address)) {
    throw new AppError(400, 'endereco_entrega is required');
  }

  const normalized = {
    nome_destinatario: String(address.nome_destinatario || address.nome || '').trim(),
    cep: String(address.cep || '').replace(/\D/g, ''),
    rua: String(address.rua || address.logradouro || '').trim(),
    numero: String(address.numero || '').trim(),
    complemento: String(address.complemento || '').trim(),
    bairro: String(address.bairro || '').trim(),
    cidade: String(address.cidade || '').trim(),
    estado: String(address.estado || address.uf || '').trim().toUpperCase(),
    telefone: String(address.telefone || '').trim(),
  };

  const requiredFields = ['nome_destinatario', 'cep', 'rua', 'numero', 'bairro', 'cidade', 'estado'];
  const missing = requiredFields.filter((field) => !normalized[field]);

  if (missing.length > 0) {
    throw new AppError(400, `endereco_entrega missing fields: ${missing.join(', ')}`);
  }

  if (normalized.cep.length !== 8) {
    throw new AppError(400, 'endereco_entrega.cep must have 8 digits');
  }

  if (normalized.estado.length !== 2) {
    throw new AppError(400, 'endereco_entrega.estado must have 2 letters');
  }

  return normalized;
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(400, 'items must be a non-empty array');
  }

  const map = new Map();

  for (const item of items) {
    const idProduto = Number(item.id_produto || item.idProduto || item.product_id || item.productId || item.id);
    const quantidade = Number(item.quantidade || item.quantity);

    if (!Number.isInteger(idProduto) || idProduto <= 0) {
      throw new AppError(400, 'each item must have a valid id_produto');
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new AppError(400, 'each item must have a positive integer quantidade');
    }

    map.set(idProduto, (map.get(idProduto) || 0) + quantidade);
  }

  return [...map.entries()].map(([id_produto, quantidade]) => ({ id_produto, quantidade }));
}

async function calcularEstoqueProduto(idProduto, transaction) {
  const movimentacoes = await db.EstoqueMovimentacao.findAll({
    where: { id_produto: idProduto },
    attributes: ['tipo', 'quantidade'],
    transaction,
  });

  return movimentacoes.reduce((total, movimentacao) => {
    const quantidade = Number(movimentacao.quantidade) || 0;
    return movimentacao.tipo === 'entrada' ? total + quantidade : total - quantidade;
  }, 0);
}

function buildNumeroPedido() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = String(now.getTime()).slice(-6);
  const random = Math.floor(Math.random() * 900 + 100);
  return `PED-${date}-${time}${random}`;
}

async function calcularFrete(enderecoEntrega, itensCalculados, fretePayload) {
  const serviceName = String(fretePayload?.name || fretePayload?.nome || '').trim().toUpperCase();
  const fromPostalCode = String(process.env.CEP_ESTOQUE || '').replace(/\D/g, '');
  const token = String(process.env.MELHOR_ENVIO_TOKEN || '').replace(/^Bearer\s+/i, '');

  if (!serviceName || !fromPostalCode || !token || typeof fetch !== 'function') {
    return { valor: 0, servico: serviceName || null };
  }

  const products = itensCalculados.map((item) => ({
    id: String(item.id_produto),
    width: Number(item.largura) || 11,
    height: Number(item.altura) || 17,
    length: Number(item.profundidade) || 11,
    weight: Number(item.peso) || 0.3,
    insurance_value: Number(item.preco_unitario) || 0,
    quantity: Number(item.quantidade) || 1,
  }));

  try {
    const response = await fetch('https://www.melhorenvio.com.br/api/v2/me/shipment/calculate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': process.env.USER_AGENT || 'pi3-pescadores',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { postal_code: fromPostalCode },
        to: { postal_code: enderecoEntrega.cep },
        products,
      }),
    });

    if (!response.ok) {
      console.warn(`[pedido] falha ao recalcular frete: ${response.status}`);
      return { valor: 0, servico: serviceName };
    }

    const data = await response.json();
    const selected = Array.isArray(data)
      ? data.find((service) => String(service.name || '').toUpperCase() === serviceName)
      : null;

    return {
      valor: selected?.price ? toMoney(selected.price) : 0,
      servico: selected?.name || serviceName,
    };
  } catch (error) {
    console.warn(`[pedido] erro ao recalcular frete: ${error.message}`);
    return { valor: 0, servico: serviceName };
  }
}

function formatItem(item) {
  const plain = item.toJSON ? item.toJSON() : item;
  const produto = plain.produto || null;
  const imagens = Array.isArray(produto?.imagens) ? produto.imagens : [];

  return {
    id: plain.id,
    id_pedido: plain.id_pedido,
    id_produto: plain.id_produto,
    nome_produto: plain.nome_produto || produto?.nome || 'Produto',
    quantidade: plain.quantidade,
    preco_unitario: formatMoney(plain.preco_unitario),
    preco: formatMoney(plain.preco_unitario),
    subtotal: formatMoney(plain.subtotal),
    produto: produto
      ? {
          id: produto.id,
          nome: produto.nome,
          ativo: produto.ativo,
          imagens: imagens.map((imagem) => ({
            id: imagem.id,
            url: normalizeImageUrl(imagem.url),
          })),
        }
      : null,
  };
}

function formatPedido(pedido) {
  const plain = pedido.toJSON ? pedido.toJSON() : pedido;
  const itens = Array.isArray(plain.itens) ? plain.itens : [];
  const enderecoEntrega = plain.endereco_entrega || plain.enderecoEntrega || null;

  return {
    id: plain.id,
    id_usuario: plain.id_usuario,
    numero_pedido: plain.numero_pedido,
    nome_cliente: plain.nome_cliente || enderecoEntrega?.nome_destinatario || 'N/A',
    status: plain.status,
    subtotal: formatMoney(plain.subtotal),
    valor_frete: formatMoney(plain.valor_frete),
    tipo_frete: plain.tipo_frete || 'N/A',
    desconto: formatMoney(plain.desconto),
    total: formatMoney(plain.total),
    valor_total: formatMoney(plain.total),
    endereco_entrega: enderecoEntrega,
    metodo_pagamento: plain.metodo_pagamento,
    observacoes: plain.observacoes,
    criado_em: plain.criado_em,
    atualizado_em: plain.atualizado_em,
    itens: itens.map(formatItem),
  };
}

function buscarItensDoPedido(idPedido, transaction) {
  return db.PedidoItem.findAll({
    where: { id_pedido: idPedido },
    include: [
      {
        model: db.Produto,
        as: 'produto',
        attributes: ['id', 'nome', 'ativo'],
        include: [
          {
            model: db.ProdutoImagem,
            as: 'imagens',
            attributes: ['id', 'url'],
          },
        ],
      },
    ],
    transaction,
  });
}

async function buscarPedidoCompleto(where, transaction) {
  try {
    console.log('[pedidoService] buscarPedidoCompleto:', { where });

    // Buscar o pedido SEM includes primeiro
    const pedido = await db.Pedido.findOne({
      where,
      transaction,
      raw: false,
    });

    if (!pedido) {
      throw new AppError(404, 'Pedido não encontrado');
    }

    // Carregar itens manualmente
    if (db.PedidoItem) {
      try {
        const itens = await buscarItensDoPedido(pedido.id, transaction);
        pedido.dataValues.itens = itens;
      } catch (itenError) {
        console.error('[pedidoService] erro ao carregar itens:', itenError.message);
        pedido.dataValues.itens = [];
      }
    }

    return pedido;
  } catch (error) {
    console.error('[pedidoService] erro em buscarPedidoCompleto:', {
      where,
      errorMessage: error.message,
      errorCode: error.code,
      stack: error.stack,
    });
    throw error;
  }
}

exports.criarPedido = async (usuarioId, payload) => {
  if (!usuarioId) {
    throw new AppError(401, 'Authentication required');
  }

  const items = normalizeItems(payload.items || payload.itens);
  const enderecoEntrega = normalizeAddress(payload.endereco_entrega || payload.enderecoEntrega);
  const metodoPagamento = normalizePaymentMethod(payload.metodo_pagamento || payload.metodoPagamento);
  const observacoes = payload.observacoes ? String(payload.observacoes).trim() : null;
  const now = new Date();

  const pedido = await db.sequelize.transaction(async (transaction) => {
    const produtos = await db.Produto.findAll({
      where: {
        id: {
          [Op.in]: items.map((item) => item.id_produto),
        },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (produtos.length !== items.length) {
      throw new AppError(404, 'Um ou mais produtos não foram encontrados');
    }

    let subtotal = 0;
    const itensCalculados = [];

    for (const item of items) {
      const produto = produtos.find((current) => Number(current.id) === item.id_produto);

      if (!produto.ativo) {
        throw new AppError(400, `Produto indisponível: ${produto.nome}`);
      }

      const estoqueAtual = await calcularEstoqueProduto(produto.id, transaction);

      if (item.quantidade > estoqueAtual) {
        throw new AppError(400, `Estoque insuficiente para ${produto.nome}`);
      }

      const precoUnitario = toMoney(produto.preco_venda);
      const itemSubtotal = toMoney(precoUnitario * item.quantidade);
      subtotal = toMoney(subtotal + itemSubtotal);

      itensCalculados.push({
        id_produto: produto.id,
        nome_produto: produto.nome,
        quantidade: item.quantidade,
        preco_unitario: formatMoney(precoUnitario),
        subtotal: formatMoney(itemSubtotal),
        peso: produto.peso,
        altura: produto.altura,
        largura: produto.largura,
        profundidade: produto.profundidade,
      });
    }

    const frete = await calcularFrete(enderecoEntrega, itensCalculados, payload.frete);
    const valorFrete = frete.valor;
    const desconto = 0;
    const total = toMoney(subtotal + valorFrete - desconto);

    const createdPedido = await db.Pedido.create(
      {
        id_usuario: usuarioId,
        numero_pedido: buildNumeroPedido(),
        status: 'pendente',
        subtotal: formatMoney(subtotal),
        valor_frete: formatMoney(valorFrete),
        tipo_frete: frete.servico || null,
        desconto: formatMoney(desconto),
        total: formatMoney(total),
        endereco_entrega: enderecoEntrega,
        metodo_pagamento: metodoPagamento,
        observacoes: observacoes,
        criado_em: now,
        atualizado_em: now,
      },
      { transaction }
    );

    await db.PedidoItem.bulkCreate(
      itensCalculados.map((item) => ({
        id_pedido: createdPedido.id,
        id_produto: item.id_produto,
        nome_produto: item.nome_produto,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal: item.subtotal,
        criado_em: now,
      })),
      { transaction }
    );

    await db.EstoqueMovimentacao.bulkCreate(
      itensCalculados.map((item) => ({
        id_produto: item.id_produto,
        tipo: 'saida',
        quantidade: item.quantidade,
        motivo: 'venda',
        created_at: now,
      })),
      { transaction }
    );

    return createdPedido;
  });

  try {
    await leadtimeService.criarLeadtimeComEventos(pedido.id, usuarioId, now);
  } catch (error) {
    console.warn(`[pedidoService] erro ao criar leadtime do pedido ${pedido.id}: ${error.message}`);
  }

  const completo = await buscarPedidoCompleto({ id: pedido.id, id_usuario: usuarioId });
  return formatPedido(completo);
};

exports.listarPedidosDoUsuario = async (usuarioId, query = {}) => {
  if (!usuarioId) {
    throw new AppError(401, 'Authentication required');
  }

  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
  const offset = (page - 1) * limit;
  const where = { id_usuario: usuarioId };

  if (query.status && ORDER_STATUSES.has(String(query.status))) {
    where.status = String(query.status);
  }

  if (query.search) {
    where.numero_pedido = {
      [getLikeOperator()]: `%${String(query.search).trim()}%`,
    };
  }

  try {
    console.log('[pedidoService] listarPedidosDoUsuario iniciado', {
      usuarioId,
      where,
      page,
      limit,
      offset,
    });

    // Validar que os modelos existem
    if (!db.Pedido) {
      const errorMsg = 'Database model "Pedido" not found';
      console.error(`[pedidoService] ${errorMsg}`);
      throw new AppError(500, errorMsg);
    }

    // Query SEM includes primeiro
    console.log('[pedidoService] executando query simples (sem includes)...');
    const { count, rows } = await db.Pedido.findAndCountAll({
      where,
      distinct: true,
      order: [['criado_em', 'DESC']],
      limit,
      offset,
    });

    console.log('[pedidoService] query simples sucesso', {
      total: count,
      rowsReturned: rows.length,
    });

    // Tentar carregar itens se houver pedidos
    if (rows.length > 0 && db.PedidoItem) {
      console.log('[pedidoService] carregando itens...');
      for (const pedido of rows) {
        try {
          const itens = await buscarItensDoPedido(pedido.id);
          pedido.dataValues.itens = itens;
        } catch (itemError) {
          console.error(`[pedidoService] erro ao carregar itens para pedido ${pedido.id}:`, itemError.message);
          pedido.dataValues.itens = [];
        }
      }
    }

    return {
      data: rows.map(formatPedido),
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    };
  } catch (error) {
    console.error('[pedidoService] erro crítico em listarPedidosDoUsuario:', {
      usuarioId,
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorCode: error.code || error.original?.code,
      stack: error.stack,
    });
    
    // Se for erro de banco de dados, adicionar contexto
    if (error.original) {
      console.error('[pedidoService] erro original (banco de dados):', {
        message: error.original.message,
        code: error.original.code,
      });
    }

    throw error;
  }
};

exports.listarTodosPedidos = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
  const offset = (page - 1) * limit;
  const where = {};

  if (query.status && ORDER_STATUSES.has(String(query.status))) {
    where.status = String(query.status);
  }

  if (query.search) {
    where.numero_pedido = {
      [getLikeOperator()]: `%${String(query.search).trim()}%`,
    };
  }

  try {
    console.log('[pedidoService] listarTodosPedidos iniciado', {
      where,
      page,
      limit,
      offset,
    });

    if (!db.Pedido) {
      const errorMsg = 'Database model "Pedido" not found';
      console.error(`[pedidoService] ${errorMsg}`);
      throw new AppError(500, errorMsg);
    }

    const { count, rows } = await db.Pedido.findAndCountAll({
      where,
      distinct: true,
      order: [['criado_em', 'DESC']],
      limit,
      offset,
    });

    console.log('[pedidoService] listarTodosPedidos sucesso', {
      total: count,
      rowsReturned: rows.length,
    });

    if (rows.length > 0 && db.PedidoItem) {
      console.log('[pedidoService] carregando itens para todos os pedidos...');
      for (const pedido of rows) {
        try {
          const itens = await buscarItensDoPedido(pedido.id);
          pedido.dataValues.itens = itens;
        } catch (itemError) {
          console.error(`[pedidoService] erro ao carregar itens para pedido ${pedido.id}:`, itemError.message);
          pedido.dataValues.itens = [];
        }
      }
    }

    return {
      data: rows.map(formatPedido),
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    };
  } catch (error) {
    console.error('[pedidoService] erro crítico em listarTodosPedidos:', {
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorCode: error.code || error.original?.code,
      stack: error.stack,
    });

    if (error.original) {
      console.error('[pedidoService] erro original (banco de dados):', {
        message: error.original.message,
        code: error.original.code,
      });
    }

    throw error;
  }
};

exports.buscarPedidoDoUsuario = async (usuarioId, idPedido) => {
  const id = Number(idPedido);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid pedido id');
  }

  const pedido = await buscarPedidoCompleto({ id, id_usuario: usuarioId });
  return formatPedido(pedido);
};

exports.buscarPedidoAdmin = async (idPedido) => {
  const id = Number(idPedido);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid pedido id');
  }

  const pedido = await buscarPedidoCompleto({ id });
  return formatPedido(pedido);
};

exports.atualizarStatusPedido = async (idPedido, status) => {
  const novoStatus = String(status || '').trim().toLowerCase();

  if (!ORDER_STATUSES.has(novoStatus)) {
    throw new AppError(400, 'status inválido');
  }

  const id = Number(idPedido);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid pedido id');
  }

  const pedidoAtualizado = await db.sequelize.transaction(async (transaction) => {
    const pedido = await buscarPedidoCompleto({ id }, transaction);

    if (pedido.status === 'cancelado' && novoStatus !== 'cancelado') {
      throw new AppError(400, 'Pedidos cancelados não podem voltar para outro status');
    }

    if (pedido.status !== 'cancelado' && novoStatus === 'cancelado') {
      await db.EstoqueMovimentacao.bulkCreate(
        pedido.itens.map((item) => ({
          id_produto: item.id_produto,
          tipo: 'entrada',
          quantidade: item.quantidade,
          motivo: 'ajuste',
          created_at: new Date(),
        })),
        { transaction }
      );
    }

    await pedido.update(
      {
        status: novoStatus,
        atualizado_em: new Date(),
      },
      { transaction }
    );

    return pedido;
  });

  if (['confirmado', 'preparando', 'enviado', 'concluido'].includes(novoStatus)) {
    try {
      await leadtimeService.registrarEventoLeadtime(pedidoAtualizado.id, pedidoAtualizado.id_usuario, novoStatus);
    } catch (error) {
      console.warn(`[pedidoService] erro ao registrar leadtime do pedido ${pedidoAtualizado.id}: ${error.message}`);
    }
  }

  const completo = await buscarPedidoCompleto({ id: pedidoAtualizado.id });
  return formatPedido(completo);
};

exports.obterFaturamentoMensal = async (meses = 12) => {
  try {
    // Buscar todos os pedidos com os status especificados
    const pedidos = await db.Pedido.findAll({
      where: {
        status: {
          [Op.in]: SALE_STATUSES,
        },
      },
      attributes: ['total', 'criado_em'],
      order: [['criado_em', 'DESC']],
    });

    // Agrupar por mês
    const faturamentoPorMes = {};
    const hoje = new Date();
    
    // Inicializar os últimos N meses com 0
    for (let i = meses - 1; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const chave = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
      faturamentoPorMes[chave] = 0;
    }

    // Somar os totais
    pedidos.forEach(pedido => {
      const data = new Date(pedido.criado_em);
      const chave = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
      
      // Apenas considerar se estiver dentro do período de meses
      if (faturamentoPorMes.hasOwnProperty(chave)) {
        faturamentoPorMes[chave] = toMoney(
          faturamentoPorMes[chave] + toMoney(pedido.total)
        );
      }
    });

    // Converter para array ordenado
    const resultado = Object.entries(faturamentoPorMes)
      .map(([mes, valor]) => ({
        mes,
        faturamento: formatMoney(valor),
        faturamentoNumerico: toMoney(valor),
      }))
      .sort((a, b) => {
        const [mesA, anoA] = a.mes.split('/').map(Number);
        const [mesB, anoB] = b.mes.split('/').map(Number);
        return anoA === anoB ? mesA - mesB : anoA - anoB;
      });



    return resultado;
  } catch (error) {
    console.error('[pedidoService] erro ao calcular faturamento mensal:', error.message);
    throw error;
  }
};

exports.obterTaxaRecompraAnual = async (ano = new Date().getFullYear()) => {
  const anoNumero = Number(ano) || new Date().getFullYear();
  const inicioAno = new Date(anoNumero, 0, 1);
  const inicioProximoAno = new Date(anoNumero + 1, 0, 1);

  const pedidos = await db.Pedido.findAll({
    where: {
      status: {
        [Op.in]: SALE_STATUSES,
      },
      criado_em: {
        [Op.gte]: inicioAno,
        [Op.lt]: inicioProximoAno,
      },
    },
    attributes: ['id_usuario'],
  });

  const comprasPorCliente = new Map();

  pedidos.forEach((pedido) => {
    const clienteId = String(pedido.id_usuario);
    comprasPorCliente.set(clienteId, (comprasPorCliente.get(clienteId) || 0) + 1);
  });

  const totalClientes = comprasPorCliente.size;
  const clientesRecompra = Array.from(comprasPorCliente.values())
    .filter((totalCompras) => totalCompras > 1).length;
  const taxa = totalClientes > 0 ? (clientesRecompra / totalClientes) * 100 : 0;

  return {
    ano: anoNumero,
    taxa: Number(taxa.toFixed(2)),
    totalClientes,
    clientesRecompra,
    statusConsiderados: SALE_STATUSES,
  };
};

exports.obterTicketMedio = async () => {
  try {
    const hoje = new Date();
    const partesMesAtual = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: 'numeric',
    }).formatToParts(hoje);
    const anoAtual = Number(partesMesAtual.find((parte) => parte.type === 'year')?.value);
    const mesAtual = Number(partesMesAtual.find((parte) => parte.type === 'month')?.value);
    const proximoMes = new Date(Date.UTC(anoAtual, mesAtual, 1));
    const inicioMes = new Date(`${anoAtual}-${String(mesAtual).padStart(2, '0')}-01T00:00:00-03:00`);
    const inicioProximoMes = new Date(
      `${proximoMes.getUTCFullYear()}-${String(proximoMes.getUTCMonth() + 1).padStart(2, '0')}-01T00:00:00-03:00`
    );
    const mesReferencia = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      month: 'long',
      year: 'numeric',
    }).format(inicioMes);

    const resultado = await db.Pedido.findOne({
      where: {
        status: {
          [Op.in]: SALE_STATUSES,
        },
        criado_em: {
          [Op.gte]: inicioMes,
          [Op.lt]: inicioProximoMes,
        },
      },
      attributes: [
        [db.sequelize.fn('AVG', db.sequelize.col('total')), 'ticket_medio'],
        [db.sequelize.fn('SUM', db.sequelize.col('total')), 'receita_total'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total_vendas'],
        [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('id_usuario'))), 'clientes_unicos'],
      ],
      raw: true,
    });

    const ticketMedio = toMoney(resultado?.ticket_medio || 0);
    const receitaTotal = toMoney(resultado?.receita_total || 0);
    const totalVendas = Number(resultado?.total_vendas || 0);
    const clientesUnicos = Number(resultado?.clientes_unicos || 0);

    return {
      ticket_medio: formatMoney(ticketMedio),
      ticketMedioNumerico: ticketMedio,
      receita_total: formatMoney(receitaTotal),
      receitaTotalNumerico: receitaTotal,
      total_vendas: totalVendas,
      clientes_unicos: clientesUnicos,
      mesReferencia,
    };
  } catch (error) {
    console.error('[pedidoService] erro ao calcular ticket medio:', error.message);
    throw error;
  }
};

exports.getUserId = getUserId;
