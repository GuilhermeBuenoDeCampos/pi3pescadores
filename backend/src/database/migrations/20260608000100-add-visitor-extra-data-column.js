'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    const columns = await queryInterface.describeTable('visitante_evento');

    if (columns.dados_adicionais) {
      return;
    }

    if (dialect === 'mysql') {
      await queryInterface.addColumn('visitante_evento', 'dados_adicionais', {
        type: Sequelize.JSON,
        allowNull: true,
      });
      return;
    }

    await queryInterface.addColumn('visitante_evento', 'dados_adicionais', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('visitante_evento', 'dados_adicionais');
  },
};
