'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('leadtime', {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      pedido_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'pedido',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      usuarios_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'usuario',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      visitante: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      carrinho: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      pendente: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      confirmado: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      preparando: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      enviado: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      concluido: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Criar índice para pedido_id
    await queryInterface.addIndex('leadtime', ['pedido_id']);

    // Criar índice para usuarios_id
    await queryInterface.addIndex('leadtime', ['usuarios_id']);

    // Criar índice para concluido (para queries que filtram por pedidos concluídos)
    await queryInterface.addIndex('leadtime', ['concluido']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('leadtime');
  },
};
