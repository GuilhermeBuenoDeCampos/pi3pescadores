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
      faturamento_baixo: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 500,
        comment: 'Valor mínimo de faturamento',
      },
      faturamento_alto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 5000,
        comment: 'Valor máximo de faturamento',
      },
      criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      atualizado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'kpi_config',
      timestamps: false,
    }
  );

  return KpiConfig;
};
