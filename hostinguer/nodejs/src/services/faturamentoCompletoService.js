'use strict';

const { Op, fn, col } = require('sequelize');
const db = require('../database/models');

const SALE_STATUSES = ['preparando', 'enviado', 'confirmado', 'concluido'];

function toMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

exports.obterResumo = async () => {
  const agora = new Date();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay());
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const mesPassadoInicio = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const mesPassadoFim = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const pedidos = await db.Pedido.findAll({
    where: { status: { [Op.in]: SALE_STATUSES } },
    attributes: ['total', 'valor_frete', 'criado_em', 'id'],
  });

  let hojeTotal = 0, ontemTotal = 0, semanaTotal = 0;
  let mesTotal = 0, mesPassadoTotal = 0;
  let hojeFrete = 0, ontemFrete = 0, semanaFrete = 0;
  let mesFrete = 0, mesPassadoFrete = 0, totalFrete = 0;
  let hojeQtd = 0, ontemQtd = 0, mesQtd = 0;

  pedidos.forEach(p => {
    const data = new Date(p.criado_em);
    const val = toMoney(p.total);
    const frete = toMoney(p.valor_frete);
    totalFrete += frete;
    if (data >= hoje) { hojeTotal += val; hojeFrete += frete; hojeQtd++; }
    if (data >= ontem && data < hoje) { ontemTotal += val; ontemFrete += frete; ontemQtd++; }
    if (data >= inicioSemana) { semanaTotal += val; semanaFrete += frete; }
    if (data >= inicioMes) { mesTotal += val; mesFrete += frete; mesQtd++; }
    if (data >= mesPassadoInicio && data < mesPassadoFim) { mesPassadoTotal += val; mesPassadoFrete += frete; }
  });

  const ticketMedioHoje = hojeQtd > 0 ? hojeTotal / hojeQtd : 0;
  const ticketMedioMes = mesQtd > 0 ? mesTotal / mesQtd : 0;

  return {
    hoje: { faturamento: toMoney(hojeTotal), frete: toMoney(hojeFrete), pedidos: hojeQtd, ticketMedio: toMoney(ticketMedioHoje) },
    ontem: { faturamento: toMoney(ontemTotal), frete: toMoney(ontemFrete), pedidos: ontemQtd },
    semana: { faturamento: toMoney(semanaTotal), frete: toMoney(semanaFrete) },
    mes: { faturamento: toMoney(mesTotal), frete: toMoney(mesFrete), pedidos: mesQtd, ticketMedio: toMoney(ticketMedioMes) },
    mesPassado: { faturamento: toMoney(mesPassadoTotal), frete: toMoney(mesPassadoFrete) },
    frete: {
      total: toMoney(totalFrete),
      mes: toMoney(mesFrete),
      hoje: toMoney(hojeFrete),
      semana: toMoney(semanaFrete),
      mesPassado: toMoney(mesPassadoFrete),
    },
  };
};

exports.obterPorCategoria = async () => {
  const results = await db.sequelize.query(`
    SELECT
      p.id_categoria,
      c.nome AS categoria,
      SUM(pi.subtotal) AS total,
      COUNT(pi.id) AS quantidade
    FROM pedido_itens pi
    JOIN produto p ON p.id = pi.id_produto
    LEFT JOIN categoria c ON c.id = p.id_categoria
    JOIN pedidos ped ON ped.id = pi.id_pedido
    WHERE ped.status IN (:statuses)
    GROUP BY p.id_categoria, c.nome
    ORDER BY total DESC
  `, {
    replacements: { statuses: SALE_STATUSES },
    type: db.Sequelize.QueryTypes.SELECT,
  });

  const data = (results || [])
    .filter(r => r.id_categoria)
    .map(r => ({
      id_categoria: r.id_categoria,
      categoria: r.categoria || `Categoria #${r.id_categoria}`,
      total: toMoney(r.total),
      quantidade: Number(r.quantidade),
    }));

  const totalGeral = data.reduce((acc, d) => acc + d.total, 0);

  return {
    categorias: data.map(d => ({
      ...d,
      percentual: totalGeral > 0 ? Number((d.total / totalGeral * 100).toFixed(2)) : 0,
    })),
    totalGeral: toMoney(totalGeral),
  };
};

exports.obterTopProdutos = async (limit = 10) => {
  const maxLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const results = await db.sequelize.query(`
    SELECT
      pi.id_produto,
      p.nome AS nome_produto,
      SUM(pi.subtotal) AS total,
      SUM(pi.quantidade) AS quantidade_vendida,
      COUNT(DISTINCT pi.id_pedido) AS pedidos
    FROM pedido_itens pi
    JOIN produto p ON p.id = pi.id_produto
    JOIN pedidos ped ON ped.id = pi.id_pedido
    WHERE ped.status IN (:statuses)
    GROUP BY pi.id_produto, p.nome
    ORDER BY total DESC
    LIMIT :maxLimit
  `, {
    replacements: { statuses: SALE_STATUSES, maxLimit },
    type: db.Sequelize.QueryTypes.SELECT,
  });

  return (results || []).map(r => ({
    id_produto: r.id_produto,
    nome_produto: r.nome_produto,
    total: toMoney(r.total),
    quantidade_vendida: Number(r.quantidade_vendida),
    pedidos: Number(r.pedidos),
  }));
};

exports.obterComparativoAnual = async () => {
  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual - 1, anoAtual];

  const pedidos = await db.Pedido.findAll({
    where: { status: { [Op.in]: SALE_STATUSES } },
    attributes: ['total', 'criado_em'],
  });

  const meses = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];

  const data = meses.map((mes, i) => {
    const m = i + 1;
    const valores = {};
    anos.forEach(ano => {
      valores[`ano${ano}`] = 0;
    });
    pedidos.forEach(p => {
      const d = new Date(p.criado_em);
      if (d.getFullYear() === anos[0] && d.getMonth() === i) {
        valores[`ano${anos[0]}`] += toMoney(p.total);
      }
      if (d.getFullYear() === anos[1] && d.getMonth() === i) {
        valores[`ano${anos[1]}`] += toMoney(p.total);
      }
    });
    return {
      mes: mes,
      ...Object.fromEntries(
        Object.entries(valores).map(([k, v]) => [k, toMoney(v)])
      ),
    };
  });

  const totais = {};
  anos.forEach(ano => {
    totais[`ano${ano}`] = toMoney(data.reduce((acc, d) => acc + d[`ano${ano}`], 0));
  });

  const variacao = totais[`ano${anos[0]}`] > 0
    ? Number(((totais[`ano${anos[1]}`] - totais[`ano${anos[0]}`]) / totais[`ano${anos[0]}`] * 100).toFixed(2))
    : 0;

  return { meses: data, totais, variacao, anos };
};

exports.obterMetaRealizado = async () => {
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
  const diasNoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate();
  const diaAtual = agora.getDate();

  const config = await db.KpiConfig.findOne({
    where: { chave: 'faturamento_alto' },
  });
  const metaMensal = config ? Number(config.valor) || 5000 : 5000;

  const pedidos = await db.Pedido.findAll({
    where: {
      status: { [Op.in]: SALE_STATUSES },
      criado_em: { [Op.gte]: inicioMes, [Op.lt]: fimMes },
    },
    attributes: ['total', 'criado_em'],
    order: [['criado_em', 'ASC']],
  });

  const realizado = pedidos.reduce((acc, p) => acc + toMoney(p.total), 0);
  const diasRestantes = diasNoMes - diaAtual + 1;
  const mediaDiaria = diaAtual > 0 ? realizado / diaAtual : 0;
  const projetado = toMoney(mediaDiaria * diasNoMes);
  const percentual = metaMensal > 0 ? Number((realizado / metaMensal * 100).toFixed(2)) : 0;

  const dias = [];
  for (let d = 1; d <= diaAtual; d++) {
    const diaInicio = new Date(agora.getFullYear(), agora.getMonth(), d);
    const diaFim = new Date(agora.getFullYear(), agora.getMonth(), d + 1);
    const diaTotal = pedidos
      .filter(p => {
        const data = new Date(p.criado_em);
        return data >= diaInicio && data < diaFim;
      })
      .reduce((acc, p) => acc + toMoney(p.total), 0);
    dias.push({ dia: d, valor: toMoney(diaTotal), acumulado: toMoney(realizado) });
  }

  const valorRestante = toMoney(Math.max(0, metaMensal - realizado));
  const precisaoDiaria = diasRestantes > 0
    ? toMoney(valorRestante / diasRestantes)
    : 0;

  return {
    meta: toMoney(metaMensal),
    realizado: toMoney(realizado),
    percentual,
    projetado,
    mediaDiaria: toMoney(mediaDiaria),
    diasRestantes,
    precisaoDiaria,
    valorRestante,
    dias,
    diaAtual,
    diasNoMes,
  };
};

exports.obterPorMetodoPagamento = async () => {
  const results = await db.Pedido.findAll({
    where: { status: { [Op.in]: SALE_STATUSES } },
    attributes: [
      'metodo_pagamento',
      [fn('SUM', col('total')), 'total'],
      [fn('COUNT', col('id')), 'quantidade'],
    ],
    group: ['metodo_pagamento'],
    raw: true,
  });

  const totalGeral = results.reduce((acc, r) => acc + toMoney(r.total), 0);
  const metodoLabels = {
    whatsapp: 'WhatsApp',
    pix: 'Pix',
    cartao: 'Cartão',
    dinheiro: 'Dinheiro',
    boleto: 'Boleto',
    outro: 'Outro',
  };

  return {
    metodos: results.map(r => ({
      metodo: r.metodo_pagamento,
      label: metodoLabels[r.metodo_pagamento] || r.metodo_pagamento,
      total: toMoney(r.total),
      quantidade: Number(r.quantidade),
      percentual: totalGeral > 0 ? Number((toMoney(r.total) / totalGeral * 100).toFixed(2)) : 0,
    })).sort((a, b) => b.total - a.total),
    totalGeral: toMoney(totalGeral),
  };
};
