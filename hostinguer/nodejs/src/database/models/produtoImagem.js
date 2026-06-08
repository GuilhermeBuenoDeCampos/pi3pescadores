'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProdutoImagem extends Model {
    static associate(models) {
      ProdutoImagem.belongsTo(models.Produto, {
        as: 'produto',
        foreignKey: 'id_produto',
      });
    }
  }

  ProdutoImagem.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      id_produto: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      url: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'ProdutoImagem',
      tableName: 'produto_imagens',
      timestamps: false,
    }
  );

  return ProdutoImagem;
};
