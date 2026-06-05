'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VisitanteEvento extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  VisitanteEvento.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      dispositivo: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      evento: {
        type: DataTypes.ENUM(
          'visitou_home',
          'visualizou_produto',
          'adicionou_produto_no_carrinho',
          'checkout',
          'comprou'
        ),
        allowNull: false,
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id',
        },
      },
      dados_adicionais: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
    },
    {
      sequelize,
      modelName: 'VisitanteEvento',
      tableName: 'visitante_evento',
      timestamps: false,
    }
  );

  return VisitanteEvento;
};
