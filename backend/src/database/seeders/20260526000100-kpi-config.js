'use strict';

module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS cnt FROM kpi_config`
    );
    if (Number(rows[0].cnt) === 0) {
      await queryInterface.bulkInsert('kpi_config', [
        { ticketbaixo: 75.00, ticketalto: 200.00, created_at: new Date(), update_at: new Date() },
      ]);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('kpi_config', null, {});
  },
};
