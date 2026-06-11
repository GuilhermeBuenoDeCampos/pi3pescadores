'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS carrinhos (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        usuario_id CHAR(36) NULL,
        guest_token CHAR(36) NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ultima_interacao_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS carrinho_itens (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        carrinho_id BIGINT NOT NULL,
        produto_id BIGINT NOT NULL,
        quantidade INTEGER NOT NULL DEFAULT 1
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX carrinho_itens_carrinho_produto_unique
      ON carrinho_itens (carrinho_id, produto_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('carrinho_itens');
    await queryInterface.dropTable('carrinhos');
  },
};