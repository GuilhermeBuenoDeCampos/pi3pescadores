'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EnderecoEntrega extends Model {
    static associate(models) {
      EnderecoEntrega.hasMany(models.Pedido, {
        as: 'pedidos',
        foreignKey: 'id_endereco_entrega',
      });
    }
  }

  EnderecoEntrega.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      cep: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      rua: {
        type: DataTypes.STRING(180),
        allowNull: true,
      },
      numero: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      complemento: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      bairro: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      cidade: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      estado: {
        type: DataTypes.STRING(2),
        allowNull: true,
      },
      pais: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'EnderecoEntrega',
      tableName: 'endereco_entrega',
      timestamps: false,
    }
  );

  return EnderecoEntrega;
};
