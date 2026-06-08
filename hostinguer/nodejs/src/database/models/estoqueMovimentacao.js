'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EstoqueMovimentacao extends Model {
    static associate(models) {
      EstoqueMovimentacao.belongsTo(models.Produto, {
        as: 'produto',
        foreignKey: 'id_produto',
      });
    }
  }

  EstoqueMovimentacao.init(
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
      tipo: {
        type: DataTypes.ENUM('entrada', 'saida'),
        allowNull: false,
      },
      quantidade: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      motivo: {
        type: DataTypes.ENUM('compra', 'venda', 'ajuste'),
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'EstoqueMovimentacao',
      tableName: 'estoque_movimentacoes',
      timestamps: false,
    }
  );

  return EstoqueMovimentacao;
};
