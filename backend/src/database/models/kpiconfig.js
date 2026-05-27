'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class KpiConfig extends Model {
    static associate() {}
  }

  KpiConfig.init(
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      ticketbaixo: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      ticketalto: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      update_at: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: 'KpiConfig',
      tableName: 'kpi_config',
      timestamps: false,
    }
  );

  return KpiConfig;
};
