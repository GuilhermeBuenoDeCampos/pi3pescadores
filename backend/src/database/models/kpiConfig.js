'use strict';

module.exports = (sequelize, DataTypes) => {
  const KpiConfig = sequelize.define(
    'KpiConfig',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      chave: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      valor: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      descricao: {
        type: DataTypes.STRING(255),
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
      tableName: 'kpi_configuracao',
      timestamps: false,
    }
  );

  return KpiConfig;
};
