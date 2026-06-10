'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('avaliacoes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      pedido_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'pedidos',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      usuario_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      nota: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: false,
      },
      atendimento: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      entrega: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      qualidade: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      preco: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      experiencia: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('avaliacoes', ['pedido_id', 'usuario_id'], {
      unique: true,
      name: 'idx_avaliacoes_pedido_usuario_unique',
    });

    await queryInterface.addIndex('avaliacoes', ['nota'], {
      name: 'idx_avaliacoes_nota',
    });

    await queryInterface.addIndex('avaliacoes', ['created_at'], {
      name: 'idx_avaliacoes_created_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('avaliacoes');
  },
};
