'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('categoria', 'id_categoria_pai', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: {
        model: 'categoria',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('categoria', ['id_categoria_pai'], {
      name: 'idx_categoria_id_categoria_pai',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('categoria', 'idx_categoria_id_categoria_pai');
    await queryInterface.removeColumn('categoria', 'id_categoria_pai');
  },
};