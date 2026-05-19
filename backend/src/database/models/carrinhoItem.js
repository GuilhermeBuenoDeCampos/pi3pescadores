'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CarrinhoItem extends Model {
    static associate(models) {
      CarrinhoItem.belongsTo(models.Carrinho, {
        as: 'carrinho',
        foreignKey: 'carrinho_id',
      });

      CarrinhoItem.belongsTo(models.Produto, {
        as: 'produto',
        foreignKey: 'produto_id',
      });
    }
  }

  CarrinhoItem.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      carrinho_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      produto_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      quantidade: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'CarrinhoItem',
      tableName: 'carrinho_itens',
      timestamps: false,
    }
  );

  return CarrinhoItem;
};