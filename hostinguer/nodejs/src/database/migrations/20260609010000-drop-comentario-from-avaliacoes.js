'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('avaliacoes').catch(() => null);

    if (table && table.comentario) {
      await queryInterface.removeColumn('avaliacoes', 'comentario');
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('avaliacoes').catch(() => null);

    if (table && !table.comentario) {
      await queryInterface.addColumn('avaliacoes', 'comentario', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },
};