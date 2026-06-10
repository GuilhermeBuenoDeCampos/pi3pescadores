-- Pesquisa de satisfacao de clientes para MySQL 8 / Hostinger.
-- Execute uma vez no banco usado pela aplicacao.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `avaliacoes` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `pedido_id` BIGINT NOT NULL,
  `usuario_id` VARCHAR(36) NOT NULL,
  `nota` DECIMAL(3,2) NOT NULL,
  `atendimento` TINYINT UNSIGNED NOT NULL,
  `entrega` TINYINT UNSIGNED NOT NULL,
  `qualidade` TINYINT UNSIGNED NOT NULL,
  `preco` TINYINT UNSIGNED NOT NULL,
  `experiencia` TINYINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_avaliacoes_pedido_usuario_unique` (`pedido_id`, `usuario_id`),
  KEY `idx_avaliacoes_nota` (`nota`),
  KEY `idx_avaliacoes_created_at` (`created_at`),
  CONSTRAINT `fk_avaliacoes_pedido`
    FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_avaliacoes_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `chk_avaliacoes_nota`
    CHECK (`nota` >= 1 AND `nota` <= 5),
  CONSTRAINT `chk_avaliacoes_atendimento`
    CHECK (`atendimento` BETWEEN 1 AND 5),
  CONSTRAINT `chk_avaliacoes_entrega`
    CHECK (`entrega` BETWEEN 1 AND 5),
  CONSTRAINT `chk_avaliacoes_qualidade`
    CHECK (`qualidade` BETWEEN 1 AND 5),
  CONSTRAINT `chk_avaliacoes_preco`
    CHECK (`preco` BETWEEN 1 AND 5),
  CONSTRAINT `chk_avaliacoes_experiencia`
    CHECK (`experiencia` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
