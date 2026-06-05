'use strict';

const carrinhoAbandonoService = require('../services/carrinhoAbandonoService');

const ONE_HOUR = 60 * 60 * 1000;

function startCarrinhoAbandonoJob() {
  if (process.env.DISABLE_CART_ABANDONMENT_JOB === 'true') {
    return null;
  }

  async function run() {
    try {
      await carrinhoAbandonoService.processarCarrinhosAbandonados();
    } catch (error) {
      console.error('[carrinho-abandono] Falha ao processar carrinhos abandonados:', error.message);
    }
  }

  run();
  const interval = setInterval(run, ONE_HOUR);
  console.info('[carrinho-abandono] Rotina agendada a cada 1 hora.');
  return interval;
}

module.exports = {
  startCarrinhoAbandonoJob,
};
