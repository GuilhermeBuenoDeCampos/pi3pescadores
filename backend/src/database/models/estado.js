'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Estado extends Model {
    static associate(models) {
      Estado.hasMany(models.Cidade, {
        as: 'cidades',
        foreignKey: 'estado_id',
      });
    }
  }

  Estado.init(
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
      uf: {
        type: DataTypes.STRING(2),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Estado',
      tableName: 'estados',
      timestamps: false,
    }
  );

  return Estado;
};