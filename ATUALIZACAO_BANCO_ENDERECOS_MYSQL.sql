-- Modulo de enderecos de usuarios para MySQL 8 / Hostinger.
-- Execute uma vez no banco usado pela aplicacao.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `estados` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(120) NOT NULL,
  `uf` CHAR(2) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_estados_uf` (`uf`),
  UNIQUE KEY `uq_estados_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cidades` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(120) NOT NULL,
  `estado_id` BIGINT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cidades_estado_nome` (`estado_id`, `nome`),
  KEY `idx_cidades_estado` (`estado_id`),
  CONSTRAINT `fk_cidades_estado`
    FOREIGN KEY (`estado_id`) REFERENCES `estados` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `enderecos_usuario` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `usuario_id` VARCHAR(36) NOT NULL,
  `cidade_id` BIGINT NOT NULL,
  `cep` VARCHAR(8) NOT NULL,
  `logradouro` VARCHAR(180) NOT NULL,
  `numero` VARCHAR(30) NOT NULL,
  `complemento` VARCHAR(120) NULL,
  `bairro` VARCHAR(120) NOT NULL,
  `apelido` VARCHAR(80) NOT NULL,
  `principal` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_enderecos_usuario` (`usuario_id`),
  KEY `idx_enderecos_cidade` (`cidade_id`),
  KEY `idx_enderecos_principal` (`usuario_id`, `principal`),
  CONSTRAINT `fk_enderecos_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_enderecos_cidade`
    FOREIGN KEY (`cidade_id`) REFERENCES `cidades` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
