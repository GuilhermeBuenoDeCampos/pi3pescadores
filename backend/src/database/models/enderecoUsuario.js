'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EnderecoUsuario extends Model {
    static associate(models) {
      EnderecoUsuario.belongsTo(models.Usuario, {
        as: 'usuario',
        foreignKey: 'usuario_id',
      });

      EnderecoUsuario.belongsTo(models.Cidade, {
        as: 'cidade',
        foreignKey: 'cidade_id',
      });
    }
  }

  EnderecoUsuario.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      cidade_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      cep: {
        type: DataTypes.STRING(8),
        allowNull: false,
      },
      logradouro: {
        type: DataTypes.STRING(180),
        allowNull: false,
      },
      numero: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      complemento: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      bairro: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      apelido: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      principal: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'EnderecoUsuario',
      tableName: 'enderecos_usuario',
      timestamps: false,
    }
  );

  return EnderecoUsuario;
};
