'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Produto extends Model {
    static associate(models) {
      Produto.belongsTo(models.Categoria, {
        as: 'categoria',
        foreignKey: 'id_categoria',
      });

      Produto.hasMany(models.ProdutoImagem, {
        as: 'imagens',
        foreignKey: 'id_produto',
      });

      Produto.hasMany(models.EstoqueMovimentacao, {
        as: 'movimentacoesEstoque',
        foreignKey: 'id_produto',
      });

      Produto.hasMany(models.PedidoItem, {
        as: 'pedidoItens',
        foreignKey: 'id_produto',
      });
    }
  }

  Produto.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      nome: {
        type: DataTypes.STRING(180),
        allowNull: false,
      },
      descricao: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      preco_custo: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      preco_venda: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      peso: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
      },
      altura: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
      },
      largura: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
      },
      profundidade: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
      },
      id_categoria: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      ativo: {
        type: DataTypes.BOOLEAN,
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
    },
    {
      sequelize,
      modelName: 'Produto',
      tableName: 'produto',
      timestamps: false,
    }
  );

  return Produto;
};
