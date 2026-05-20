'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE enderecos_usuario
      DROP COLUMN IF EXISTS estado_id;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE enderecos_usuario
      ADD COLUMN IF NOT EXISTS estado_id BIGINT;
    `);
  },
};
