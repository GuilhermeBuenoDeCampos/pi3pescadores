'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Leadtime extends Model {
    static associate(models) {
      Leadtime.belongsTo(models.Pedido, {
        as: 'pedido',
        foreignKey: 'pedido_id',
      });

      Leadtime.belongsTo(models.Usuario, {
        as: 'usuario',
        foreignKey: 'usuarios_id',
      });
    }
  }

  Leadtime.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      pedido_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: 'pedido',
          key: 'id',
        },
      },
      usuarios_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'usuario',
          key: 'id',
        },
      },
      visitante: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      carrinho: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      pendente: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      confirmado: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      preparando: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      enviado: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      concluido: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Leadtime',
      tableName: 'leadtime',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Leadtime;
};
