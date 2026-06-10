'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Pedido extends Model {
    static associate(models) {
      Pedido.belongsTo(models.Usuario, {
        as: 'usuario',
        foreignKey: 'id_usuario',
      });

      Pedido.hasMany(models.PedidoItem, {
        as: 'itens',
        foreignKey: 'id_pedido',
      });

      Pedido.belongsTo(models.EnderecoEntrega, {
        as: 'enderecoEntrega',
        foreignKey: 'id_endereco_entrega',
      });

      Pedido.hasOne(models.Avaliacao, {
        as: 'avaliacao',
        foreignKey: 'pedido_id',
      });

    }
  }

  Pedido.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      id_usuario: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      numero_pedido: {
        type: DataTypes.STRING(32),
        allowNull: false,
        unique: true,
      },
      status: {
        type: DataTypes.ENUM('pendente', 'confirmado', 'preparando', 'enviado', 'concluido', 'cancelado'),
        allowNull: false,
      },
      subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      valor_frete: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
      tipo_frete: {
        type: DataTypes.ENUM('PAC', 'SEDEX'),
        allowNull: true,
      },
      desconto: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      id_endereco_entrega: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      metodo_pagamento: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      atualizado_em: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Pedido',
      tableName: 'pedidos',
      timestamps: false,
    }
  );

  return Pedido;
};
