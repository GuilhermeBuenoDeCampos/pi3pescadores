'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Cidade extends Model {
    static associate(models) {
      Cidade.belongsTo(models.Estado, {
        as: 'estado',
        foreignKey: 'estado_id',
      });

      Cidade.hasMany(models.EnderecoUsuario, {
        as: 'enderecos',
        foreignKey: 'cidade_id',
      });
    }
  }

  Cidade.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      nome: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      estado_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Cidade',
      tableName: 'cidades',
      timestamps: false,
    }
  );

  return Cidade;
};