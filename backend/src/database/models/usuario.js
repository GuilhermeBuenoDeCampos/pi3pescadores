'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Usuario extends Model {
    static associate(models) {
      Usuario.hasMany(models.Pedido, {
        as: 'pedidos',
        foreignKey: 'id_usuario',
      });

      Usuario.hasMany(models.EnderecoUsuario, {
        as: 'enderecos',
        foreignKey: 'usuario_id',
      });
    }
  }

  Usuario.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      nome: {
        type: DataTypes.STRING(180),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(180),
        allowNull: false,
      },
      telefone: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      tipo_usuario: {
        type: DataTypes.ENUM('admin', 'cliente', 'funcionario'),
        allowNull: false,
      },
      cpf: {
        type: DataTypes.STRING(11),
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
      senha_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      ultimo_login_em: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Usuario',
      tableName: 'usuarios',
      timestamps: false,
    }
  );

  return Usuario;
};
