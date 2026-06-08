'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Categoria extends Model {
    static associate(models) {
      Categoria.hasMany(models.Categoria, {
        as: 'subcategorias',
        foreignKey: 'id_categoria_pai',
      });

      Categoria.belongsTo(models.Categoria, {
        as: 'categoriaPai',
        foreignKey: 'id_categoria_pai',
      });

      Categoria.hasMany(models.Produto, {
        as: 'produtos',
        foreignKey: 'id_categoria',
      });
    }
  }

  Categoria.init(
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
      descricao: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      id_categoria_pai: {
        type: DataTypes.BIGINT,
        allowNull: true,
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
      modelName: 'Categoria',
      tableName: 'categoria',
      timestamps: false,
    }
  );

  return Categoria;
};
