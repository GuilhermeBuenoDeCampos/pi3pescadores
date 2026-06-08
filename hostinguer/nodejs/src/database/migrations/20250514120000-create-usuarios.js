'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
      },
      nome: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(120),
        allowNull: false,
        unique: true,
      },
      cpf: {
        type: Sequelize.STRING(11),
        allowNull: false,
        unique: true,
        validate: {
          len: [11, 11],
        },
      },
      telefone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      criado_em: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      tipo_usuario: {
        type: Sequelize.ENUM('cliente', 'administrador', 'vendedor'),
        allowNull: false,
        defaultValue: 'cliente',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Criar índices para melhor performance
    await queryInterface.addIndex('usuarios', ['email']);
    await queryInterface.addIndex('usuarios', ['cpf']);
    await queryInterface.addIndex('usuarios', ['tipo_usuario']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('usuarios');
  },
};
