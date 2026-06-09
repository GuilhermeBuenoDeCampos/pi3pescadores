'use strict';

const carrinhoAbandonoService = require('../services/carrinhoAbandonoService');

let intervalId = null;

function startCarrinhoAbandonoJob() {
  if (intervalId) {
    return intervalId;
  }

  const run = async () => {
    try {
      await carrinhoAbandonoService.processarCarrinhosAbandonados();
    } catch (error) {
      console.error('[carrinho-abandono] Falha ao processar carrinhos abandonados:', error.message);
    }
  };

  run();
  intervalId = setInterval(run, 60 * 60 * 1000);
  console.info('[carrinho-abandono] Rotina agendada a cada 1 hora.');

  return intervalId;
}

module.exports = {
  startCarrinhoAbandonoJob,
};
