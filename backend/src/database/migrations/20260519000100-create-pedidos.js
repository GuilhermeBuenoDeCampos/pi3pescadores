'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pedidos', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      id_usuario: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      numero_pedido: {
        type: Sequelize.STRING(32),
        allowNull: false,
        unique: true,
      },
      status: {
        type: Sequelize.ENUM('pendente', 'confirmado', 'preparando', 'enviado', 'concluido', 'cancelado'),
        allowNull: false,
        defaultValue: 'pendente',
      },
      subtotal: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      valor_frete: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      desconto: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      endereco_entrega: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      metodo_pagamento: {
        type: Sequelize.STRING(60),
        allowNull: false,
      },
      observacoes: {
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

    await queryInterface.createTable('pedido_itens', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      id_pedido: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'pedidos',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      id_produto: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'produto',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      nome_produto: {
        type: Sequelize.STRING(180),
        allowNull: false,
      },
      quantidade: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      preco_unitario: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      subtotal: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      criado_em: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('pedidos', ['id_usuario', 'criado_em'], {
      name: 'idx_pedidos_usuario_criado_em',
    });
    await queryInterface.addIndex('pedidos', ['status'], {
      name: 'idx_pedidos_status',
    });
    await queryInterface.addIndex('pedido_itens', ['id_pedido'], {
      name: 'idx_pedido_itens_id_pedido',
    });
    await queryInterface.addIndex('pedido_itens', ['id_produto'], {
      name: 'idx_pedido_itens_id_produto',
    });

    await queryInterface.sequelize.query(
      'ALTER TABLE pedido_itens ADD CONSTRAINT chk_pedido_itens_quantidade_positiva CHECK (quantidade > 0);'
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pedido_itens');
    await queryInterface.dropTable('pedidos');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_pedidos_status";');
  },
};
