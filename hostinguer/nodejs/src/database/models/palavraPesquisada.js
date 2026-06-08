'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PalavraPesquisada extends Model {}

  PalavraPesquisada.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      palavra: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'PalavraPesquisada',
      tableName: 'palavras_pesquisadas',
      timestamps: false,
    }
  );

  return PalavraPesquisada;
};
