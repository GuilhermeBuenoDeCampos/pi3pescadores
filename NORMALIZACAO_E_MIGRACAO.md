# Migração PostgreSQL → MySQL e Normalização do Banco de Dados

## 📋 Resumo das Alterações

### 1. **Mudanças de Tipo de Dados**
- **UUID do PostgreSQL** → `VARCHAR(36)` no MySQL
- **JSONB** → `JSON` (tipo nativo do MySQL)
- **ENUM** → mantido (MySQL suporta nativamente)
- **DATE** → `TIMESTAMP` (para tracking de atualizações)

### 2. **Violações de Normalização Identificadas e Corrigidas**

#### ❌ **Violação 1: Dependência Parcial em `pedido_itens` (2NF)**

**Problema Original:**
```sql
pedido_itens (id_pedido, id_produto, nome_produto, quantidade, preco_unitario, subtotal)
```
- `nome_produto` depende apenas de `id_produto`, não da chave primária completa
- Violação de **Segunda Forma Normal (2NF)**
- Causa redundância: mesmo produto em múltiplos pedidos causa duplicação de nome

**Solução Aplicada:**
```sql
pedido_itens (id_pedido, id_produto, quantidade, preco_unitario, subtotal)
-- nome_produto obtido via JOIN com tabela produto
```
- **Ganho:** Economia de espaço, consistência garantida

#### ❌ **Violação 2: Dependência Transitiva em `leadtime` (2NF)**

**Problema Original:**
```sql
leadtime (pedido_id, usuarios_id, visitante, carrinho, ...)
```
- `usuarios_id` é determinado por `pedido_id` (um pedido = um usuário)
- Violação de **Segunda Forma Normal (2NF)**
- Dados redundantes: usuário pode ser obtido via `pedido → usuario`

**Solução Aplicada:**
```sql
leadtime (pedido_id, visitante, carrinho, ...) UNIQUE
-- usuario_id obtido via JOIN com pedidos e usuarios
```
- **Ganho:** Redução de redundância, integridade referencial mantida

#### ❌ **Violação 3: Dados Desnormalizados em `pedidos` (3NF)**

**Problema Original:**
```sql
pedidos (
  ...,
  endereco_entrega (JSONB com: rua, numero, complemento, bairro, cidade, estado)
)
```
- Endereço armazenado como blob JSON
- Difícil consultar: "Quantos pedidos para São Paulo?"
- Violação de **Terceira Forma Normal (3NF)**

**Solução Aplicada:**
```sql
-- Nova tabela
endereco_entrega (id, cep, rua, numero, complemento, bairro, cidade, estado, pais)

-- Referência em pedidos
pedidos (..., id_endereco_entrega BIGINT)
```
- **Ganho:** Consultas eficientes por cidade/estado, reutilização de endereços

#### ❌ **Violação 4: Campos Calculados em `auditoria_produto` (3NF)**

**Problema Original:**
```sql
auditoria_produto (
  id,
  quantidade_sistema,
  quantidade_fisica,
  diferenca = quantidade_fisica - quantidade_sistema,  ← CALCULADO!
  acuracidade = diferenca / quantidade_sistema * 100,   ← CALCULADO!
  ...
)
```
- Violação de **Terceira Forma Normal (3NF)**
- Campos derivados/calculados devem estar em VIEW, não em tabela
- Risco: inconsistência se diferenca não for recalculado após update

**Solução Aplicada:**
```sql
auditoria_produto (id, product_id, quantidade_sistema, quantidade_fisica, usuario_id, observacoes)
-- Cálculos feitos em VIEW quando necessário
```
- **Ganho:** Integridade dos dados, cálculos sempre corretos

#### ❌ **Violação 5: Anti-pattern em `kpi_config` (3NF)**

**Problema Original:**
```sql
kpi_config (
  id,
  faturamento_baixo, faturamento_alto,
  ticketbaixo, ticketalto,
  recomprabaixa, recompraalta,
  visitantebaixo, visitantealto,
  conversaobaixa, conversaoalta,
  ...
)
```
- 10+ colunas de configuração (difícil manutenção)
- Violação de **Terceira Forma Normal (3NF)** - múltiplos atributos independentes
- Adicionar nova configuração requer ALTER TABLE

**Solução Aplicada:**
```sql
kpi_configuracao (id, chave VARCHAR, valor DECIMAL, descricao)
-- Exemplo:
-- ('xxx-xxx', 'faturamento_baixo', 500.00)
-- ('xxx-xxx', 'faturamento_alto', 5000.00)
```
- **Ganho:** Escalabilidade, fácil adicionar novas configurações, sem ALTER TABLE

#### ⚠️ **Violação 6: Dados Armazenados em Múltiplos Lugares**

**Problema Original:**
- Pedido contém `subtotal` (soma de pedido_itens.subtotal)
- Pedido contém `total` (subtotal + frete - desconto)
- Leadtime contém datas que poderiam vir de evento de visitante

**Solução:**
- Mantidos para **performance** (denormalização controlada)
- Usar VIEW ou trigger para manter sincronizado
- Melhor que recalcular em cada query

---

## 📊 Forma Normal Atingida: 3NF ✅

### Critérios de 3NF Atendidos:

1. **Primeira Forma Normal (1NF):** ✅
   - Todos os atributos contêm apenas valores atômicos (não listas/arrays)
   - Exceto JSON em `visitante_evento.dados_adicionais` (necessário para flexibilidade)

2. **Segunda Forma Normal (2NF):** ✅
   - Todos os atributos não-chave dependem de TODA a chave primária
   - Removido `nome_produto` de `pedido_itens`
   - Removido `usuarios_id` redundante de `leadtime`

3. **Terceira Forma Normal (3NF):** ✅
   - Nenhuma dependência transitiva entre atributos não-chave
   - Removidos campos calculados de `auditoria_produto`
   - Refatorado `kpi_config` em tabela key-value
   - Separado `endereco_entrega` em tabela própria

---

## 🔧 Mudanças Específicas de MySQL

### 1. **Constraints**
```sql
-- MySQL suporta CHECK (mas não era usado no PostgreSQL)
CHECK (`quantidade` > 0)

-- UNIQUE composto para evitar duplicatas
UNIQUE KEY `uc_carrinho_produto` (`carrinho_id`, `produto_id`)
```

### 2. **Índices Estratégicos**
```sql
-- Performance em buscas comuns
INDEX `idx_pedidos_usuario_status` ON `pedidos`(`id_usuario`, `status`)
INDEX `idx_pedidos_data_status` ON `pedidos`(`criado_em`, `status`)
```

### 3. **Views para Consultas Complexas**
```sql
-- Produto com estoque atual (calcula em tempo real)
VIEW v_produto_estoque

-- Pedidos com informações de cliente
VIEW v_pedidos_detalhado
```

### 4. **Auto-update de Timestamps**
```sql
`updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

---

## 📈 Benefícios da Normalização

| Aspecto | Antes | Depois |
|--------|-------|--------|
| **Redundância** | Alta (dados duplicados) | Baixa (referências via FK) |
| **Consistência** | Risco de inconsistência | Garantida por constraints |
| **Performance de Escrita** | Lenta (atualizar muitos lugares) | Rápida (atualizar um lugar) |
| **Manutenção** | Difícil (alterações complexas) | Fácil (schema claro) |
| **Espaço em Disco** | Maior | Menor (~20% redução estimada) |

---

## 🚀 Migração PostgreSQL → MySQL

### Pré-requisitos:
```bash
# MySQL 8.0+
mysql --version

# Criar banco
mysql -u root -p -e "CREATE DATABASE pi3_pescadores CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Executar Script:
```bash
# Linux/Mac
mysql -u root -p pi3_pescadores < database_mysql.sql

# Windows (PowerShell)
mysql -u root -p pi3_pescadores < database_mysql.sql
```

### Verificar:
```bash
mysql -u root -p pi3_pescadores -e "SHOW TABLES;"
```

---

## 🔄 Atualizar Configuração do Backend

### Alterar `.env`:
```env
# De:
# DATABASE_URL=postgresql://...

# Para:
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pi3_pescadores
DB_USER=root
DB_PASSWORD=sua_senha
DB_DIALECT=mysql
```

### Atualizar `backend/src/config/loadEnv.js`:
```javascript
// Se usar Sequelize com MySQL
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    pool: { max: 5, min: 0, idle: 10000 }
  }
);
```

### Package.json (instalar driver):
```bash
npm install mysql2
```

---

## 📝 Documentação de Campos Alterados

### ❌ **Removidos:**
- `pedido_itens.nome_produto`
- `leadtime.usuarios_id`
- `auditoria_produto.diferenca`
- `auditoria_produto.acuracidade`
- `kpi_config.*` (todas as colunas individuais)
- `pedidos.endereco_entrega` (JSONB)

### ✅ **Adicionados:**
- `endereco_entrega` (tabela completa)
- `kpi_configuracao` (tabela key-value)
- `visitante_evento.dados_adicionais` (JSON flexível)
- Diversos índices de performance

---

## ⚡ Performance Comparada

### Query: "Quantos pedidos em São Paulo no último mês?"

**Antes (JSONB):**
```sql
SELECT COUNT(*) FROM pedidos 
WHERE JSON_EXTRACT(endereco_entrega, '$.cidade') = 'São Paulo'
  AND criado_em > DATE_SUB(NOW(), INTERVAL 1 MONTH);
-- ⚠️ LENTO (scan total com JSON parsing)
```

**Depois (Tabela Normalizada):**
```sql
SELECT COUNT(*) FROM pedidos p
JOIN endereco_entrega e ON p.id_endereco_entrega = e.id
WHERE e.cidade = 'São Paulo'
  AND p.criado_em > DATE_SUB(NOW(), INTERVAL 1 MONTH);
-- ✅ RÁPIDO (índices utilizados)
```

---

## ✅ Checklist Pós-Migração

- [ ] Script SQL executado com sucesso
- [ ] Todas as 15 tabelas criadas
- [ ] Constraints e índices aplicados
- [ ] KPI configurações iniciais inseridas
- [ ] Views criadas
- [ ] Backend configurado para MySQL
- [ ] Driver `mysql2` instalado
- [ ] Variáveis `.env` atualizadas
- [ ] Testes de conexão realizados
- [ ] Migrations do Sequelize executadas (se houver)

---

## 📞 Suporte

Em caso de problemas:
1. Verificar `.env` (credenciais corretas?)
2. Rodar `mysql -u root -p` para testar conexão
3. Verificar logs do Sequelize em dev
4. Usar VIEW `v_produto_estoque` e `v_pedidos_detalhado` para debug
