'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('kpi_config', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      faturamento_baixo: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 500,
      },
      faturamento_alto: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 5000,
      },
      criado_em: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      atualizado_em: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('kpi_config');
  },
};
