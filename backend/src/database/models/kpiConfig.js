'use strict';

module.exports = (sequelize, DataTypes) => {
  const KpiConfig = sequelize.define(
    'KpiConfig',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      faturamento_baixo: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 500,
      },
      faturamento_alto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 5000,
      },
      ticketbaixo: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      ticketalto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        field: 'created_at',
      },
      update_at: {
        type: DataTypes.DATE,
        field: 'update_at',
      },
    },
    {
      tableName: 'kpi_config',
      timestamps: false,
    }
  );

  return KpiConfig;
};
