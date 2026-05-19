'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Carrinho extends Model {
    static associate(models) {
      Carrinho.belongsTo(models.Usuario, {
        as: 'usuario',
        foreignKey: 'usuario_id',
      });

      Carrinho.hasMany(models.CarrinhoItem, {
        as: 'itens',
        foreignKey: 'carrinho_id',
      });
    }
  }

  Carrinho.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      guest_token: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      atualizado_em: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      ultima_interacao_em: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Carrinho',
      tableName: 'carrinhos',
      timestamps: false,
    }
  );

  return Carrinho;
};