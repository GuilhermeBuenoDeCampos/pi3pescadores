'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('pedidos');

    if (!table.tipo_frete) {
      await queryInterface.addColumn('pedidos', 'tipo_frete', {
        type: Sequelize.STRING(20),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('pedidos');

    if (table.tipo_frete) {
      await queryInterface.removeColumn('pedidos', 'tipo_frete');
    }
  },
};
