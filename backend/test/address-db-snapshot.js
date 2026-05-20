'use strict';

const db = require('../src/database/models');

async function main() {
  const queryInterface = db.sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  const normalizedTables = tables.map((table) => (typeof table === 'string' ? table : table.tableName));

  for (const tableName of ['enderecos_usuario', 'enderecos', 'cidades', 'estados']) {
    if (!normalizedTables.includes(tableName)) {
      console.log(`${tableName}: table_not_found`);
      continue;
    }

    const rows = await db.sequelize.query(`SELECT * FROM ${tableName} LIMIT 3`, {
      type: db.Sequelize.QueryTypes.SELECT,
    });

    console.log(`${tableName}: ${JSON.stringify(rows)}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.sequelize.close();
  });
