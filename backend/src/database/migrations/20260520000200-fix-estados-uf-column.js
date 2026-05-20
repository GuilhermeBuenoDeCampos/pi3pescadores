'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'estados'
            AND column_name = 'sigla'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'estados'
            AND column_name = 'uf'
        ) THEN
          ALTER TABLE estados RENAME COLUMN sigla TO uf;
        END IF;
      END
      $$;
    `);

    await queryInterface.sequelize.query('DROP INDEX IF EXISTS estados_sigla_unique;');
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS estados_uf_unique
      ON estados (uf);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS estados_uf_unique;');

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'estados'
            AND column_name = 'uf'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'estados'
            AND column_name = 'sigla'
        ) THEN
          ALTER TABLE estados RENAME COLUMN uf TO sigla;
        END IF;
      END
      $$;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS estados_sigla_unique
      ON estados (sigla);
    `);
  },
};
