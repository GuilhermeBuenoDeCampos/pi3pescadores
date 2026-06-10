'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AnalyticsComportamento extends Model {
    static associate(models) {
    }
  }

  AnalyticsComportamento.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      sessao_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      tipo: {
        type: DataTypes.ENUM('page_view', 'click', 'hover'),
        allowNull: false,
      },
      pagina: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      elemento: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      coordenada_x: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      coordenada_y: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      duracao_ms: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      largura_tela: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      altura_tela: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      origem: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id',
        },
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
      modelName: 'AnalyticsComportamento',
      tableName: 'analytics_comportamento',
      timestamps: false,
    }
  );

  return AnalyticsComportamento;
};
