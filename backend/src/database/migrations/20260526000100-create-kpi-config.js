'use strict';

async function columnExists(queryInterface, Sequelize, tableName, columnName) {
  const result = await queryInterface.sequelize.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = :tableName AND column_name = :columnName
    ) AS "exists"`,
    {
      replacements: { tableName, columnName },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  return Boolean(result[0]?.exists);
}

async function tableExists(queryInterface, Sequelize, tableName) {
  const result = await queryInterface.sequelize.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = :tableName
    ) AS "exists"`,
    {
      replacements: { tableName },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  return Boolean(result[0]?.exists);
}

async function addColumnIfMissing(queryInterface, Sequelize, tableName, columnName, definition) {
  if (!(await columnExists(queryInterface, Sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const exists = await tableExists(queryInterface, Sequelize, 'kpi_config');

    if (!exists) {
      await queryInterface.createTable('kpi_config', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        faturamento_baixo: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 500,
        },
        faturamento_alto: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 5000,
        },
        ticketbaixo: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 75,
        },
        ticketalto: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 200,
        },
        recomprabaixa: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 20,
        },
        recompraalta: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 50,
        },
        visitantebaixo: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 100,
        },
        visitantealto: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 500,
        },
        conversaobaixa: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 2,
        },
        conversaoalta: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 8,
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        update_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
      return;
    }

    await addColumnIfMissing(queryInterface, Sequelize, 'kpi_config', 'ticketbaixo', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 75,
    });
    await addColumnIfMissing(queryInterface, Sequelize, 'kpi_config', 'ticketalto', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 200,
    });
    await addColumnIfMissing(queryInterface, Sequelize, 'kpi_config', 'recomprabaixa', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 20,
    });
    await addColumnIfMissing(queryInterface, Sequelize, 'kpi_config', 'recompraalta', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 50,
    });
    await addColumnIfMissing(queryInterface, Sequelize, 'kpi_config', 'visitantebaixo', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 100,
    });
    await addColumnIfMissing(queryInterface, Sequelize, 'kpi_config', 'visitantealto', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 500,
    });
    await addColumnIfMissing(queryInterface, Sequelize, 'kpi_config', 'conversaobaixa', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 2,
    });
    await addColumnIfMissing(queryInterface, Sequelize, 'kpi_config', 'conversaoalta', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 8,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('kpi_config', 'ticketbaixo');
    await queryInterface.removeColumn('kpi_config', 'ticketalto');
    await queryInterface.removeColumn('kpi_config', 'recomprabaixa');
    await queryInterface.removeColumn('kpi_config', 'recompraalta');
    await queryInterface.removeColumn('kpi_config', 'visitantebaixo');
    await queryInterface.removeColumn('kpi_config', 'visitantealto');
    await queryInterface.removeColumn('kpi_config', 'conversaobaixa');
    await queryInterface.removeColumn('kpi_config', 'conversaoalta');
  },
};
