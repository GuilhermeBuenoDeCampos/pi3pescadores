'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PedidoItem extends Model {
    static associate(models) {
      PedidoItem.belongsTo(models.Pedido, {
        as: 'pedido',
        foreignKey: 'id_pedido',
      });

      PedidoItem.belongsTo(models.Produto, {
        as: 'produto',
        foreignKey: 'id_produto',
      });
    }
  }

  PedidoItem.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      id_pedido: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      id_produto: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      quantidade: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      preco_unitario: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'PedidoItem',
      tableName: 'pedido_itens',
      timestamps: false,
    }
  );

  return PedidoItem;
};
