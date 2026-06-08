'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categoria', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      nome: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      criado_em: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      atualizado_em: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('produto', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      nome: {
        type: Sequelize.STRING(180),
        allowNull: false,
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      preco_custo: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      preco_venda: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      peso: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
      },
      altura: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
      },
      largura: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
      },
      profundidade: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
      },
      id_categoria: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'categoria',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      ativo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      criado_em: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      atualizado_em: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('produto_imagens', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      id_produto: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'produto',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      url: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      criado_em: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('estoque_movimentacoes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      id_produto: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'produto',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      tipo: {
        type: Sequelize.ENUM('entrada', 'saida'),
        allowNull: false,
      },
      quantidade: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      motivo: {
        type: Sequelize.ENUM('compra', 'venda', 'ajuste'),
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('estoque_movimentacoes');
    await queryInterface.dropTable('produto_imagens');
    await queryInterface.dropTable('produto');
    await queryInterface.dropTable('categoria');
  },
};