-- ============================================================================
-- PI3 PESCADORES - Schema MySQL com Normalização 3NF
-- ============================================================================
-- Conversão de PostgreSQL/Supabase para MySQL
-- Correções aplicadas:
--   1. Removido 'nome_produto' de pedido_itens (violação 2NF)
--   2. Removido 'usuarios_id' de leadtime (determinado por pedido_id)
--   3. Separado 'endereco_entrega' em tabela própria
--   4. Removidos campos calculados de auditoria_produto
--   5. Refatorado kpi_config em tabela key-value
--   6. UUIDs para VARCHAR(36) para compatibilidade MySQL
-- ============================================================================

SET FOREIGN_KEY_CHECKS=0;

-- ============================================================================
-- 1. TABELA: USUARIOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `nome` VARCHAR(180) NOT NULL,
  `email` VARCHAR(180) NOT NULL UNIQUE,
  `telefone` VARCHAR(30),
  `tipo_usuario` ENUM('admin', 'cliente', 'funcionario') NOT NULL DEFAULT 'cliente',
  `cpf` VARCHAR(11),
  `senha_hash` VARCHAR(255) NOT NULL,
  `ativo` BOOLEAN DEFAULT TRUE,
  `ultimo_login_em` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_email` (`email`),
  INDEX `idx_tipo_usuario` (`tipo_usuario`),
  INDEX `idx_ativo` (`ativo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. TABELA: CATEGORIA
-- ============================================================================
CREATE TABLE IF NOT EXISTS `categoria` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(120) NOT NULL,
  `descricao` TEXT,
  `id_categoria_pai` BIGINT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`id_categoria_pai`) REFERENCES `categoria`(`id`) ON DELETE CASCADE,
  INDEX `idx_nome` (`nome`),
  INDEX `idx_categoria_pai` (`id_categoria_pai`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. TABELA: PRODUTO
-- ============================================================================
CREATE TABLE IF NOT EXISTS `produto` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(180) NOT NULL,
  `descricao` TEXT,
  `preco_custo` DECIMAL(12,2) NOT NULL,
  `preco_venda` DECIMAL(12,2) NOT NULL,
  `peso` DECIMAL(10,3),
  `altura` DECIMAL(10,3),
  `largura` DECIMAL(10,3),
  `profundidade` DECIMAL(10,3),
  `id_categoria` BIGINT NOT NULL,
  `ativo` BOOLEAN DEFAULT TRUE,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`id_categoria`) REFERENCES `categoria`(`id`) ON DELETE RESTRICT,
  INDEX `idx_nome` (`nome`),
  INDEX `idx_categoria` (`id_categoria`),
  INDEX `idx_ativo` (`ativo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. TABELA: PRODUTO_IMAGENS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `produto_imagens` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `id_produto` BIGINT NOT NULL,
  `url` TEXT NOT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`id_produto`) REFERENCES `produto`(`id`) ON DELETE CASCADE,
  INDEX `idx_produto` (`id_produto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. TABELA: ESTOQUE_MOVIMENTACOES
-- ============================================================================
CREATE TABLE IF NOT EXISTS `estoque_movimentacoes` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `id_produto` BIGINT NOT NULL,
  `tipo` ENUM('entrada', 'saida') NOT NULL,
  `quantidade` INT NOT NULL,
  `motivo` ENUM('compra', 'venda', 'ajuste') NOT NULL,
  `observacao` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`id_produto`) REFERENCES `produto`(`id`) ON DELETE RESTRICT,
  INDEX `idx_produto` (`id_produto`),
  INDEX `idx_tipo` (`tipo`),
  INDEX `idx_data` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. TABELA: CARRINHO
-- ============================================================================
CREATE TABLE IF NOT EXISTS `carrinhos` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` VARCHAR(36),
  `guest_token` VARCHAR(36),
  `status` VARCHAR(30) DEFAULT 'ativo',
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ultima_interacao_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  INDEX `idx_usuario` (`usuario_id`),
  INDEX `idx_guest_token` (`guest_token`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. TABELA: CARRINHO_ITENS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `carrinho_itens` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `carrinho_id` BIGINT NOT NULL,
  `produto_id` BIGINT NOT NULL,
  `quantidade` INT NOT NULL CHECK (`quantidade` > 0),
  `preco_unitario` DECIMAL(12,2) NOT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`carrinho_id`) REFERENCES `carrinhos`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`produto_id`) REFERENCES `produto`(`id`) ON DELETE RESTRICT,
  UNIQUE KEY `uc_carrinho_produto` (`carrinho_id`, `produto_id`),
  INDEX `idx_produto` (`produto_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. TABELA: ENDERECO_ENTREGA (Normalização - separado de pedido)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `endereco_entrega` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `cep` VARCHAR(10),
  `rua` VARCHAR(180),
  `numero` VARCHAR(10),
  `complemento` VARCHAR(255),
  `bairro` VARCHAR(120),
  `cidade` VARCHAR(120),
  `estado` VARCHAR(2),
  `pais` VARCHAR(80) DEFAULT 'Brasil',
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_cep` (`cep`),
  INDEX `idx_cidade` (`cidade`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. TABELA: PEDIDO
-- ============================================================================
CREATE TABLE IF NOT EXISTS `pedidos` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `id_usuario` VARCHAR(36) NOT NULL,
  `numero_pedido` VARCHAR(32) NOT NULL UNIQUE,
  `status` ENUM('pendente', 'confirmado', 'preparando', 'enviado', 'concluido', 'cancelado') DEFAULT 'pendente',
  `subtotal` DECIMAL(12,2) NOT NULL,
  `valor_frete` DECIMAL(12,2),
  `tipo_frete` ENUM('PAC', 'SEDEX'),
  `desconto` DECIMAL(12,2) DEFAULT 0,
  `total` DECIMAL(12,2) NOT NULL,
  `id_endereco_entrega` BIGINT,
  `metodo_pagamento` VARCHAR(60),
  `observacoes` TEXT,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`id_endereco_entrega`) REFERENCES `endereco_entrega`(`id`) ON DELETE SET NULL,
  INDEX `idx_usuario` (`id_usuario`),
  INDEX `idx_numero_pedido` (`numero_pedido`),
  INDEX `idx_status` (`status`),
  INDEX `idx_data` (`criado_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 10. TABELA: PEDIDO_ITENS (NORMALIZADO - sem nome_produto duplicado)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `pedido_itens` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `id_pedido` BIGINT NOT NULL,
  `id_produto` BIGINT NOT NULL,
  `quantidade` INT NOT NULL CHECK (`quantidade` > 0),
  `preco_unitario` DECIMAL(12,2) NOT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`id_pedido`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`id_produto`) REFERENCES `produto`(`id`) ON DELETE RESTRICT,
  INDEX `idx_pedido` (`id_pedido`),
  INDEX `idx_produto` (`id_produto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 11. TABELA: LEADTIME (NORMALIZADO - sem usuarios_id redundante)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `leadtime` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `pedido_id` BIGINT NOT NULL UNIQUE,
  `visitante` TIMESTAMP NULL,
  `carrinho` TIMESTAMP NULL,
  `pendente` TIMESTAMP NULL,
  `confirmado` TIMESTAMP NULL,
  `preparando` TIMESTAMP NULL,
  `enviado` TIMESTAMP NULL,
  `concluido` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE,
  INDEX `idx_concluido` (`concluido`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 12. TABELA: AUDITORIA_PRODUTO (NORMALIZADO - sem campos calculados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `auditoria_produto` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `product_id` BIGINT NOT NULL,
  `quantidade_sistema` INT NOT NULL,
  `quantidade_fisica` INT NOT NULL,
  `usuario_id` VARCHAR(36),
  `observacoes` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `produto`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL,
  INDEX `idx_produto` (`product_id`),
  INDEX `idx_data` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 13. TABELA: KPI_CONFIGURACAO (NORMALIZADO - key-value pattern)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `kpi_configuracao` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `chave` VARCHAR(100) NOT NULL UNIQUE,
  `valor` DECIMAL(12,2) NOT NULL,
  `descricao` VARCHAR(255),
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_chave` (`chave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dados iniciais de KPI
INSERT INTO `kpi_configuracao` (`id`, `chave`, `valor`, `descricao`) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'faturamento_baixo', 500.00, 'Limite baixo de faturamento'),
('550e8400-e29b-41d4-a716-446655440002', 'faturamento_alto', 5000.00, 'Limite alto de faturamento'),
('550e8400-e29b-41d4-a716-446655440003', 'ticketbaixo', 75.00, 'Ticket mínimo'),
('550e8400-e29b-41d4-a716-446655440004', 'ticketalto', 200.00, 'Ticket máximo'),
('550e8400-e29b-41d4-a716-446655440005', 'recompra_baixa', 20.00, 'Taxa de recompra baixa'),
('550e8400-e29b-41d4-a716-446655440006', 'recompra_alta', 50.00, 'Taxa de recompra alta'),
('550e8400-e29b-41d4-a716-446655440007', 'visitante_baixo', 100.00, 'Visitantes mínimo'),
('550e8400-e29b-41d4-a716-446655440008', 'visitante_alto', 500.00, 'Visitantes máximo'),
('550e8400-e29b-41d4-a716-446655440009', 'conversao_baixa', 2.00, 'Taxa de conversão baixa %'),
('550e8400-e29b-41d4-a716-446655440010', 'conversao_alta', 8.00, 'Taxa de conversão alta %');

-- ============================================================================
-- 14. TABELA: PALAVRAS_PESQUISADAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `palavras_pesquisadas` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `palavra` VARCHAR(255) NOT NULL,
  `quantidade` INT DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_palavra` (`palavra`),
  INDEX `idx_data` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 15. TABELA: VISITANTE_EVENTO
-- ============================================================================
CREATE TABLE IF NOT EXISTS `visitante_evento` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ip` VARCHAR(45),
  `dispositivo` VARCHAR(255),
  `evento` ENUM('visitou_home', 'visualizou_produto', 'adicionou_produto_no_carrinho', 'checkout', 'comprou') NOT NULL,
  `usuario_id` VARCHAR(36),
  `dados_adicionais` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL,
  INDEX `idx_evento` (`evento`),
  INDEX `idx_usuario` (`usuario_id`),
  INDEX `idx_ip` (`ip`),
  INDEX `idx_data` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;

-- ============================================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ============================================================================
CREATE INDEX `idx_pedidos_usuario_status` ON `pedidos`(`id_usuario`, `status`);
CREATE INDEX `idx_pedidos_data_status` ON `pedidos`(`criado_em`, `status`);
CREATE INDEX `idx_estoque_data_tipo` ON `estoque_movimentacoes`(`created_at`, `tipo`);
CREATE INDEX `idx_carrinho_status_data` ON `carrinhos`(`status`, `ultima_interacao_em`);

-- ============================================================================
-- VIEW: Produto com Estoque Atual
-- ============================================================================
CREATE OR REPLACE VIEW `v_produto_estoque` AS
SELECT 
  p.`id`,
  p.`nome`,
  p.`descricao`,
  p.`preco_venda`,
  COALESCE(SUM(CASE WHEN em.`tipo` = 'entrada' THEN em.`quantidade` ELSE -em.`quantidade` END), 0) AS `estoque_atual`
FROM `produto` p
LEFT JOIN `estoque_movimentacoes` em ON p.`id` = em.`id_produto`
GROUP BY p.`id`, p.`nome`, p.`descricao`, p.`preco_venda`;

-- ============================================================================
-- VIEW: Pedidos com Informações de Cliente
-- ============================================================================
CREATE OR REPLACE VIEW `v_pedidos_detalhado` AS
SELECT 
  ped.`id`,
  ped.`numero_pedido`,
  u.`nome` AS `cliente_nome`,
  u.`email` AS `cliente_email`,
  ped.`status`,
  ped.`total`,
  ped.`criado_em`,
  COUNT(pi.`id`) AS `quantidade_itens`
FROM `pedidos` ped
JOIN `usuarios` u ON ped.`id_usuario` = u.`id`
LEFT JOIN `pedido_itens` pi ON ped.`id` = pi.`id_pedido`
GROUP BY ped.`id`, ped.`numero_pedido`, u.`nome`, u.`email`, ped.`status`, ped.`total`, ped.`criado_em`;

-- ============================================================================
-- FIM DO SCRIPT SQL
-- ============================================================================
