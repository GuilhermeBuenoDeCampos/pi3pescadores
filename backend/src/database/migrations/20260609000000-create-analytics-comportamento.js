'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('analytics_comportamento', {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      sessao_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      tipo: {
        type: Sequelize.ENUM('page_view', 'click', 'hover'),
        allowNull: false,
      },
      pagina: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      elemento: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      coordenada_x: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      coordenada_y: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      duracao_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      largura_tela: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      altura_tela: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      origem: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      usuario_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('analytics_comportamento', ['tipo']);
    await queryInterface.addIndex('analytics_comportamento', ['pagina'], {
      length: 255,
    });
    await queryInterface.addIndex('analytics_comportamento', ['created_at']);
    await queryInterface.addIndex('analytics_comportamento', ['sessao_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('analytics_comportamento');
  },
};
