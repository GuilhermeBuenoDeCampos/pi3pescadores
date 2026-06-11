-- Analytics de comportamento de usuarios para MySQL 8 / Hostinger.
-- Execute uma vez no banco usado pela aplicacao.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `analytics_comportamento` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `sessao_id` VARCHAR(36) NOT NULL,
  `tipo` ENUM('page_view', 'click', 'hover') NOT NULL,
  `pagina` VARCHAR(500) NOT NULL,
  `elemento` VARCHAR(500) NULL,
  `coordenada_x` INT NULL,
  `coordenada_y` INT NULL,
  `duracao_ms` INT NULL,
  `largura_tela` INT NULL,
  `altura_tela` INT NULL,
  `origem` VARCHAR(500) NULL,
  `usuario_id` VARCHAR(36) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_analytics_tipo` (`tipo`),
  KEY `idx_analytics_pagina` (`pagina`(255)),
  KEY `idx_analytics_created_at` (`created_at`),
  KEY `idx_analytics_sessao_id` (`sessao_id`),
  KEY `idx_analytics_usuario_id` (`usuario_id`),
  CONSTRAINT `fk_analytics_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
