'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Avaliacao extends Model {
    static associate(models) {
      Avaliacao.belongsTo(models.Pedido, {
        as: 'pedido',
        foreignKey: 'pedido_id',
      });

      Avaliacao.belongsTo(models.Usuario, {
        as: 'usuario',
        foreignKey: 'usuario_id',
      });
    }
  }

  Avaliacao.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      pedido_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      nota: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: false,
      },
      atendimento: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      entrega: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      qualidade: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      preco: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      experiencia: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Avaliacao',
      tableName: 'avaliacoes',
      timestamps: false,
    }
  );

  return Avaliacao;
};
