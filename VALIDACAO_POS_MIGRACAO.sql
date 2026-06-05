# Script de Validação e Testes Pós-Migração MySQL

## 1. Validar Estrutura do Banco

```sql
-- Conectar ao banco pi3_pescadores
USE pi3_pescadores;

-- Verificar todas as tabelas criadas
SHOW TABLES;
-- Resultado esperado: 15 tabelas

-- Verificar contagem de tabelas
SELECT COUNT(*) as total_tables FROM information_schema.tables 
WHERE table_schema = 'pi3_pescadores' AND table_type = 'BASE TABLE';
-- Resultado esperado: 15

-- Verificar estrutura de cada tabela
DESCRIBE usuarios;
DESCRIBE categoria;
DESCRIBE produto;
DESCRIBE produto_imagens;
DESCRIBE estoque_movimentacoes;
DESCRIBE carrinhos;
DESCRIBE carrinho_itens;
DESCRIBE endereco_entrega;
DESCRIBE pedidos;
DESCRIBE pedido_itens;
DESCRIBE leadtime;
DESCRIBE auditoria_produto;
DESCRIBE kpi_configuracao;
DESCRIBE palavras_pesquisadas;
DESCRIBE visitante_evento;
```

---

## 2. Validar Integridade Referencial (Foreign Keys)

```sql
-- Listar todas as FKs
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'pi3_pescadores' 
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME;

-- Verificar se FKs estão ativadas
SHOW VARIABLES LIKE 'foreign_key_checks';
-- Resultado esperado: ON
```

---

## 3. Validar Índices

```sql
-- Listar todos os índices
SHOW INDEX FROM usuarios;
SHOW INDEX FROM produto;
SHOW INDEX FROM pedidos;
SHOW INDEX FROM estoque_movimentacoes;
SHOW INDEX FROM visitante_evento;

-- Contar índices criados
SELECT COUNT(*) as total_indices 
FROM information_schema.statistics 
WHERE table_schema = 'pi3_pescadores' 
  AND index_name != 'PRIMARY';
-- Resultado esperado: 25+ índices
```

---

## 4. Validar Views

```sql
-- Listar todas as views
SHOW FULL TABLES IN pi3_pescadores WHERE TABLE_TYPE = 'VIEW';

-- Testar view de produto com estoque
SELECT * FROM v_produto_estoque LIMIT 5;

-- Testar view de pedidos detalhado
SELECT * FROM v_pedidos_detalhado LIMIT 5;
```

---

## 5. Validar Dados KPI Iniciais

```sql
-- Verificar se todas as configurações KPI foram inseridas
SELECT COUNT(*) as total_kpi_configs FROM kpi_configuracao;
-- Resultado esperado: 10

-- Listar todas as configurações
SELECT * FROM kpi_configuracao ORDER BY chave;

-- Validar valores específicos
SELECT valor FROM kpi_configuracao WHERE chave = 'faturamento_baixo';
-- Resultado esperado: 500.00
```

---

## 6. Validar Constraints

```sql
-- Testar UNIQUE em numero_pedido
-- Isso deve funcionar (primeira vez)
INSERT INTO pedidos (id_usuario, numero_pedido, subtotal, total) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'PED-001', 100.00, 100.00);

-- Isso deve gerar erro (UNIQUE violation)
INSERT INTO pedidos (id_usuario, numero_pedido, subtotal, total) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'PED-001', 200.00, 200.00);
-- Erro esperado: Duplicate entry 'PED-001'

-- Limpar (deletar o teste)
DELETE FROM pedidos WHERE numero_pedido = 'PED-001';

-- Testar CHECK constraint em carrinho_itens
INSERT INTO carrinho_itens (carrinho_id, produto_id, quantidade, preco_unitario)
VALUES (1, 1, 0, 100.00);
-- Erro esperado: Check constraint violated (quantidade > 0)
```

---

## 7. Validar Tipos de Dados

```sql
-- Verificar UUIDs estão como VARCHAR(36)
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'id';

-- Verificar DECIMALs estão corretos
SELECT COLUMN_NAME, DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'produto' 
  AND COLUMN_NAME IN ('preco_custo', 'preco_venda');
-- Resultado esperado: DECIMAL(12,2)

-- Verificar ENUMs
SELECT COLUMN_NAME, COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('pedidos', 'estoque_movimentacoes', 'visitante_evento')
  AND COLUMN_TYPE LIKE '%enum%';
```

---

## 8. Performance - Teste de Índices

```sql
-- Query sem índice seria lenta (full table scan)
EXPLAIN SELECT * FROM pedidos 
WHERE id_usuario = '550e8400-e29b-41d4-a716-446655440000' 
  AND status = 'confirmado';
-- Resultado esperado: type = 'ref', rows = pequeno número

-- Query com JOIN utilizando índices
EXPLAIN SELECT p.numero_pedido, u.nome, p.total
FROM pedidos p
JOIN usuarios u ON p.id_usuario = u.id
WHERE p.criado_em > DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY p.criado_em DESC
LIMIT 10;
-- Resultado esperado: All indexes usadas, rows small
```

---

## 9. Validar Normalização

```sql
-- Verificar que pedido_itens NÃO tem nome_produto
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'pedido_itens' 
  AND COLUMN_NAME = 'nome_produto';
-- Resultado esperado: (empty/nenhuma linha)

-- Verificar que leadtime NÃO tem usuarios_id
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'leadtime' 
  AND COLUMN_NAME IN ('usuarios_id', 'usuario_id');
-- Resultado esperado: (empty/nenhuma linha)

-- Verificar que pedidos NÃO tem endereco_entrega JSON
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'pedidos' 
  AND COLUMN_NAME = 'endereco_entrega';
-- Resultado esperado: (empty/nenhuma linha)

-- Verificar que auditoria_produto NÃO tem campos calculados
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'auditoria_produto' 
  AND COLUMN_NAME IN ('diferenca', 'acuracidade');
-- Resultado esperado: (empty/nenhuma linha)

-- Verificar que kpi_config foi substituída por kpi_configuracao
SHOW TABLES LIKE '%kpi%';
-- Resultado esperado: kpi_configuracao (não kpi_config)
```

---

## 10. Teste de Integridade Referencial

```sql
-- Inserir teste: Usuário
INSERT INTO usuarios (id, nome, email, senha_hash, ativo) 
VALUES (
  'test-user-001',
  'Teste User',
  'teste@example.com',
  'hash_senha_123',
  TRUE
);

-- Inserir teste: Categoria
INSERT INTO categoria (nome, descricao)
VALUES ('Eletrônicos', 'Produtos eletrônicos em geral');

-- Inserir teste: Produto (referencia categoria)
INSERT INTO produto (nome, descricao, preco_custo, preco_venda, id_categoria, ativo)
VALUES (
  'Mouse Logitech',
  'Mouse sem fio',
  25.00,
  49.90,
  1,
  TRUE
);

-- Inserir teste: Endereço
INSERT INTO endereco_entrega (cep, rua, numero, bairro, cidade, estado, pais)
VALUES ('01310-100', 'Avenida Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP', 'Brasil');

-- Inserir teste: Pedido (referencia usuario e endereco)
INSERT INTO pedidos (id_usuario, numero_pedido, subtotal, total, id_endereco_entrega, status)
VALUES (
  'test-user-001',
  'TEST-001',
  49.90,
  50.00,
  1,
  'pendente'
);

-- Inserir teste: PedidoItem (referencia pedido e produto)
INSERT INTO pedido_itens (id_pedido, id_produto, quantidade, preco_unitario, subtotal)
VALUES (
  1,
  1,
  1,
  49.90,
  49.90
);

-- Inserir teste: Leadtime (referencia pedido)
INSERT INTO leadtime (pedido_id, visitante, carrinho, pendente)
VALUES (
  1,
  NOW(),
  NOW(),
  NOW()
);

-- Teste: Tentar deletar categoria que tem produto (deve falhar)
DELETE FROM categoria WHERE id = 1;
-- Erro esperado: Cannot delete or update a parent row (FK constraint)

-- Limpeza (sem erro, pois tem ON DELETE CASCADE)
DELETE FROM pedidos WHERE numero_pedido = 'TEST-001';
DELETE FROM endereco_entrega WHERE id = 1;
DELETE FROM produto WHERE id = 1;
DELETE FROM categoria WHERE id = 1;
DELETE FROM usuarios WHERE id = 'test-user-001';
```

---

## 11. Teste de Cardinality

```sql
-- Validar relacionamento 1-to-Many: Categoria has Many Produtos
SELECT c.id, c.nome, COUNT(p.id) as total_produtos
FROM categoria c
LEFT JOIN produto p ON c.id = p.id_categoria
GROUP BY c.id, c.nome;

-- Validar relacionamento 1-to-Many: Pedido has Many PedidoItem
SELECT p.id, p.numero_pedido, COUNT(pi.id) as total_itens
FROM pedidos p
LEFT JOIN pedido_itens pi ON p.id = pi.id_pedido
GROUP BY p.id, p.numero_pedido;

-- Validar relacionamento 1-to-1: Pedido has 1 Leadtime
SELECT p.id, p.numero_pedido, lt.id as leadtime_id
FROM pedidos p
LEFT JOIN leadtime lt ON p.id = lt.pedido_id;
-- Resultado esperado: max 1 leadtime por pedido (UNIQUE key)
```

---

## 12. Space/Size Analysis

```sql
-- Tamanho de cada tabela
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.TABLES 
WHERE table_schema = 'pi3_pescadores'
ORDER BY (data_length + index_length) DESC;

-- Tamanho total do banco
SELECT 
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Total Size (MB)'
FROM information_schema.TABLES 
WHERE table_schema = 'pi3_pescadores';
```

---

## 13. Backup Imediato

```bash
# Linux/Mac/Windows PowerShell
mysqldump -u root -p pi3_pescadores > pi3_pescadores_backup_$(date +%Y%m%d_%H%M%S).sql

# Windows CMD
mysqldump -u root -p pi3_pescadores > pi3_pescadores_backup_%date:~-4%_%date:~-10,2%_%date:~-7,2%.sql
```

---

## 14. Checklist de Validação Pós-Migração

```markdown
## ✅ Checklist de Validação

- [ ] 15 tabelas criadas com sucesso
- [ ] Todas as foreign keys funcionando
- [ ] Índices criados e ativos
- [ ] KPI configurações inseridas (10 registros)
- [ ] Views criadas e consultáveis
- [ ] UUIDs como VARCHAR(36)
- [ ] DECIMALs com precisão (12,2)
- [ ] ENUMs funcionando
- [ ] Constraints UNIQUE funcionando
- [ ] Constraints CHECK funcionando
- [ ] Campos calculados REMOVIDOS:
  - [ ] ✗ pedido_itens.nome_produto
  - [ ] ✗ leadtime.usuarios_id
  - [ ] ✗ auditoria_produto.diferenca
  - [ ] ✗ auditoria_produto.acuracidade
- [ ] Tabelas criadas:
  - [ ] ✓ endereco_entrega (novo)
  - [ ] ✓ kpi_configuracao (novo)
- [ ] Integridade referencial testada
- [ ] Performance de índices validada
- [ ] Backup realizado
- [ ] Backend configurado para MySQL
- [ ] Aplicação rodando sem erros
```

---

## 15. Troubleshooting

### Erro: "Foreign key constraint is incorrectly formed"
```sql
-- Verificar tipos de dados das FKs
-- UUIDs do lado do filho devem ser VARCHAR(36)
-- e do lado do pai também devem ser VARCHAR(36)

-- Listar todas as FKs com tipos
SELECT 
  KCU.TABLE_NAME,
  KCU.COLUMN_NAME,
  C.DATA_TYPE,
  KCU.REFERENCED_TABLE_NAME,
  KCU.REFERENCED_COLUMN_NAME,
  C2.DATA_TYPE
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU
JOIN INFORMATION_SCHEMA.COLUMNS C ON KCU.TABLE_NAME = C.TABLE_NAME 
  AND KCU.COLUMN_NAME = C.COLUMN_NAME
JOIN INFORMATION_SCHEMA.COLUMNS C2 ON KCU.REFERENCED_TABLE_NAME = C2.TABLE_NAME 
  AND KCU.REFERENCED_COLUMN_NAME = C2.COLUMN_NAME
WHERE KCU.TABLE_SCHEMA = 'pi3_pescadores' 
  AND KCU.REFERENCED_TABLE_NAME IS NOT NULL;
```

### Erro: "Duplicate entry" em INSERT
```sql
-- Verificar AUTO_INCREMENT
SHOW CREATE TABLE usuarios;
SHOW CREATE TABLE produto;

-- Se necessário resetar AUTO_INCREMENT
ALTER TABLE produto AUTO_INCREMENT = 1;
```

### Erro: "Check constraint failed"
```sql
-- Verificar constraints CHECK
SELECT CONSTRAINT_NAME, CHECK_CLAUSE
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'pi3_pescadores';
```

---

## 📞 Suporte Rápido

| Problema | Solução |
|----------|---------|
| Não consegue conectar ao MySQL | Verificar credenciais no `.env`, MySQL rodando |
| Foreign key constraint error | Verificar tipos de dados (UUID = VARCHAR(36)) |
| UUID não funciona | MySQL não tem UUID nativo, usar VARCHAR(36) |
| Índices não sendo usados | Rodas `ANALYZE TABLE tabela` para atualizar stats |
| Performance lenta | Rodar `EXPLAIN` em queries para validar índices |
