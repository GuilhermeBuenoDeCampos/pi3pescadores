'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    if (dialect === 'mysql') {
      await queryInterface.sequelize.query(`
        ALTER TABLE carrinhos
        MODIFY status VARCHAR(30) NOT NULL DEFAULT 'ativo';
      `);

      await queryInterface.sequelize.query(`
        UPDATE carrinhos
        SET status = 'ativo'
        WHERE status = 'active';
      `);

      const cartItems = await queryInterface.describeTable('carrinho_itens');

      if (!cartItems.preco_unitario) {
        await queryInterface.addColumn('carrinho_itens', 'preco_unitario', {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
        });
      }

      await queryInterface.sequelize.query(`
        UPDATE carrinho_itens ci
        JOIN produto p ON p.id = ci.produto_id
        SET ci.preco_unitario = p.preco_venda
        WHERE ci.preco_unitario IS NULL;
      `);

      await queryInterface.sequelize.query(`
        ALTER TABLE carrinho_itens
        MODIFY preco_unitario DECIMAL(12, 2) NOT NULL;
      `);

      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS visitante_evento (
          id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          ip VARCHAR(45),
          dispositivo VARCHAR(255),
          evento ENUM('visitou_home', 'visualizou_produto', 'adicionou_produto_no_carrinho', 'checkout', 'comprou') NOT NULL,
          usuario_id VARCHAR(36),
          dados_adicionais JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
          INDEX idx_visitante_evento_evento (evento),
          INDEX idx_visitante_evento_usuario (usuario_id),
          INDEX idx_visitante_evento_ip (ip),
          INDEX idx_visitante_evento_created_at (created_at)
        );
      `);

      const visitorColumns = await queryInterface.describeTable('visitante_evento');

      if (!visitorColumns.dados_adicionais) {
        await queryInterface.addColumn('visitante_evento', 'dados_adicionais', {
          type: Sequelize.JSON,
          allowNull: true,
        });
      }

      return;
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE carrinhos
      ALTER COLUMN status SET DEFAULT 'ativo';
    `);

    await queryInterface.sequelize.query(`
      UPDATE carrinhos
      SET status = 'ativo'
      WHERE status = 'active';
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE carrinho_itens
      ADD COLUMN IF NOT EXISTS preco_unitario DECIMAL(12, 2);
    `);

    await queryInterface.sequelize.query(`
      UPDATE carrinho_itens ci
      SET preco_unitario = p.preco_venda
      FROM produto p
      WHERE p.id = ci.produto_id
        AND ci.preco_unitario IS NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE carrinho_itens
      ALTER COLUMN preco_unitario SET NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF to_regclass('public.visitante_evento') IS NULL
          AND EXISTS (
            SELECT 1
            FROM pg_type t
            JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = 'public'
              AND t.typname = 'visitante_evento'
              AND t.typtype = 'e'
          ) THEN
          ALTER TYPE visitante_evento RENAME TO visitante_evento_enum;
        END IF;

        IF to_regclass('public.visitante_evento') IS NULL
          AND to_regclass('public.visitante_eventos') IS NOT NULL THEN
          ALTER TABLE visitante_eventos RENAME TO visitante_evento;
        END IF;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS visitante_evento (
        id BIGSERIAL PRIMARY KEY,
        ip VARCHAR(45),
        dispositivo VARCHAR(255),
        evento VARCHAR(60) NOT NULL CHECK (
          evento IN (
            'visitou_home',
            'visualizou_produto',
            'adicionou_produto_no_carrinho',
            'checkout',
            'comprou'
          )
        ),
        usuario_id UUID NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL,
        dados_adicionais JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_visitante_evento_evento
      ON visitante_evento (evento);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_visitante_evento_usuario
      ON visitante_evento (usuario_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_visitante_evento_ip
      ON visitante_evento (ip);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_visitante_evento_created_at
      ON visitante_evento (created_at);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE visitante_evento
      ADD COLUMN IF NOT EXISTS dados_adicionais JSONB;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS carrinhos_active_usuario_unique;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS carrinhos_active_guest_token_unique;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS carrinhos_ativo_usuario_unique
      ON carrinhos (usuario_id)
      WHERE status = 'ativo' AND usuario_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS carrinhos_ativo_guest_token_unique
      ON carrinhos (guest_token)
      WHERE status = 'ativo' AND guest_token IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();

    await queryInterface.sequelize.query('DROP TABLE IF EXISTS visitante_evento;');

    if (dialect !== 'mysql') {
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS carrinhos_ativo_usuario_unique;');
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS carrinhos_ativo_guest_token_unique;');
    }
  },
};
