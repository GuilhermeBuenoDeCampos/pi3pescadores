'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const exists = await queryInterface.sequelize.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kpi_config') AS "exists"`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    if (!exists[0].exists) {
      await queryInterface.createTable('kpi_config', {
        id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.BIGINT },
        ticketbaixo: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 75.00 },
        ticketalto: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 200.00 },
        created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        update_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('kpi_config');
  },
};
