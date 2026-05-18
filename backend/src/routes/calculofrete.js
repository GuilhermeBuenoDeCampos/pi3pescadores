const { Router } = require('express');
const fetch = require('node-fetch');

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

  // Format postal codes (remove hyphens)
  const fromCEP = from_postal_code.replace(/\D/g, '');
  const toCEP = to_postal_code.replace(/\D/g, '');

  const melhorenvioProducts = products.map(p => ({
    id: String(p.id),
    width: Number(p.dimensoes?.largura) || 11,
    height: Number(p.dimensoes?.altura) || 17,
    length: Number(p.dimensoes?.comprimento) || 11,
    weight: Number(p.peso) || 0.3,
    insurance_value: Number(p.preco_venda) || 0,
    quantity: Number(p.quantity) || 1,
  }));

  try {
    // Remove "Bearer " prefix if it exists
    const token = (process.env.MELHOR_ENVIO_TOKEN || '').replace(/^Bearer\s+/i, '');

    const response = await fetch('https://www.melhorenvio.com.br/api/v2/me/shipment/calculate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': process.env.USER_AGENT,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { postal_code: fromCEP },
        to: { postal_code: toCEP },
        products: melhorenvioProducts,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Melhor Envio API Error:', response.status, errorData);
      return res.status(response.status).json({ error: 'Erro ao calcular o frete.', details: errorData });
    }

    const data = await response.json();

    // Filter for PAC and SEDEX only
    const filteredServices = data.filter(service => ['PAC', 'SEDEX'].includes(service.name));

    res.json(filteredServices.map(service => ({
      name: service.name,
      price: service.price,
      delivery_time: service.delivery_time,
    })));

  } catch (err) {
    console.error('Erro ao calcular frete:', err.message);
    res.status(500).json({ error: 'Erro ao calcular o frete.', details: err.message });
  }
});

module.exports = router;
