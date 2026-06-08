"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		// migration intentionally left as a no-op. The project doesn't require
		// a separate 'stocks' table; stock is computed from 'estoque_movimentacoes'.
		return Promise.resolve();
	},

	async down(queryInterface, Sequelize) {
		// no-op rollback
		return Promise.resolve();
	},
};
