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
      },
      faturamento_alto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 5000,
      },
      ticketbaixo: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 75,
      },
      ticketalto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 200,
      },
      recomprabaixa: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 20,
      },
      recompraalta: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 50,
      },
      visitantebaixo: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 100,
      },
      visitantealto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 500,
      },
      conversaobaixa: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 2,
      },
      conversaoalta: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 8,
      },
    },
    {
      tableName: 'kpi_config',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'update_at',
    }
  );

  return KpiConfig;
};
