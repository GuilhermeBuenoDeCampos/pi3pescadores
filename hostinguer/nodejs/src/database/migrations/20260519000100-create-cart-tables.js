'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS carrinhos (
        id BIGSERIAL PRIMARY KEY,
        usuario_id UUID NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL,
        guest_token UUID NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ultima_interacao_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS carrinho_itens (
        id BIGSERIAL PRIMARY KEY,
        carrinho_id BIGINT NOT NULL REFERENCES carrinhos(id) ON UPDATE CASCADE ON DELETE CASCADE,
        produto_id BIGINT NOT NULL REFERENCES produto(id) ON UPDATE CASCADE ON DELETE CASCADE,
        quantidade INTEGER NOT NULL DEFAULT 1
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS carrinho_itens_carrinho_produto_unique
      ON carrinho_itens (carrinho_id, produto_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS carrinhos_active_usuario_unique
      ON carrinhos (usuario_id)
      WHERE status = 'active' AND usuario_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS carrinhos_active_guest_token_unique
      ON carrinhos (guest_token)
      WHERE status = 'active' AND guest_token IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('carrinho_itens');
    await queryInterface.dropTable('carrinhos');
  },
};