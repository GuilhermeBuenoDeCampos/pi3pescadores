const { Router } = require('express');
const melhorenvio = require('@api/melhorenvio');

const router = Router();

router.post('/', async (req, res) => {
  const { to_postal_code, products } = req.body;

  if (!to_postal_code || !products || !Array.isArray(products)) {
    return res.status(400).json({ error: 'CEP de destino e lista de produtos são obrigatórios.' });
  }

  const from_postal_code = process.env.CEP_ESTOQUE;
  if (!from_postal_code) {
    return res.status(500).json({ error: 'CEP de origem não configurado.' });
  }

  const melhorenvioProducts = products.map(p => ({
    id: String(p.id),
    width: Number(p.dimensoes?.largura) || 1,
    height: Number(p.dimensoes?.altura) || 1,
    length: Number(p.dimensoes?.comprimento) || 1,
    weight: Number(p.peso) || 0.1,
    insurance_value: Number(p.preco_venda) || 0,
    quantity: Number(p.quantity) || 1,
  }));

  try {
    const { data } = await melhorenvio.calculoDeFretesPorProdutos({
      from: { postal_code: from_postal_code },
      to: { postal_code: to_postal_code },
      products: melhorenvioProducts,
    }, {
      Authorization: process.env.MELHOR_ENVIO_TOKEN,
      'User-Agent': process.env.USER_AGENT,
    });

    const filteredServices = data.filter(service => ['PAC', 'SEDEX'].includes(service.name));

    res.json(filteredServices.map(service => ({
        name: service.name,
        price: service.price,
        delivery_time: service.delivery_time,
    })));

  } catch (err) {
    console.error('Erro ao calcular frete:', err.data || err.message);
    res.status(500).json({ error: 'Erro ao calcular o frete.', details: err.data });
  }
});

module.exports = router;
