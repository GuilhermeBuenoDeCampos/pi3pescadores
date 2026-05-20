'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS estados (
        id BIGSERIAL PRIMARY KEY,
        nome VARCHAR(120) NOT NULL,
        uf VARCHAR(2) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS estados_uf_unique
      ON estados (uf);
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS estados_nome_unique
      ON estados (nome);
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS cidades (
        id BIGSERIAL PRIMARY KEY,
        nome VARCHAR(120) NOT NULL,
        estado_id BIGINT NOT NULL REFERENCES estados(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS cidades_estado_nome_unique
      ON cidades (estado_id, nome);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS cidades_estado_id_idx
      ON cidades (estado_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS enderecos_usuario (
        id BIGSERIAL PRIMARY KEY,
        usuario_id UUID NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE,
        cidade_id BIGINT NOT NULL REFERENCES cidades(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        cep VARCHAR(8) NOT NULL,
        logradouro VARCHAR(180) NOT NULL,
        numero VARCHAR(30) NOT NULL,
        complemento VARCHAR(120) NULL,
        bairro VARCHAR(120) NOT NULL,
        apelido VARCHAR(80) NOT NULL,
        principal BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS enderecos_usuario_usuario_idx
      ON enderecos_usuario (usuario_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS enderecos_usuario_cidade_idx
      ON enderecos_usuario (cidade_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS enderecos_usuario_principal_unique
      ON enderecos_usuario (usuario_id)
      WHERE principal = true;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS enderecos_usuario;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS cidades;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS estados;');
  },
};
