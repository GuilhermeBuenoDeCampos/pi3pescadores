# Guia de Migração Backend: PostgreSQL → MySQL

## 1. Instalar Dependências MySQL

### Opção A: Instalar MySQL Server Localmente

**Windows:**
```bash
# Usando Chocolatey (se tiver instalado)
choco install mysql

# Ou baixar do site
# https://dev.mysql.com/downloads/mysql/

# Iniciar serviço MySQL
# Services (Windows+R → services.msc) → MySQL → Start
```

**macOS:**
```bash
# Usando Homebrew
brew install mysql

# Iniciar MySQL
brew services start mysql

# Configura senha root (padrão: sem senha)
mysql_secure_installation
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install mysql-server

# Iniciar
sudo systemctl start mysql

# Segurança
sudo mysql_secure_installation
```

### Opção B: Usar Docker

```bash
# Criar container MySQL
docker run --name pi3-mysql \
  -e MYSQL_ROOT_PASSWORD=senha_forte \
  -e MYSQL_DATABASE=pi3_pescadores \
  -p 3306:3306 \
  -d mysql:8.0

# Verificar se está rodando
docker ps | grep pi3-mysql
```

---

## 2. Criar Banco de Dados

```bash
# Conectar ao MySQL
mysql -u root -p

# Dentro do MySQL:
CREATE DATABASE pi3_pescadores CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Verificar
SHOW DATABASES;

# Sair
EXIT;
```

---

## 3. Executar Script SQL

```bash
# Linux/Mac
mysql -u root -p pi3_pescadores < database_mysql.sql

# Windows
mysql -u root -p pi3_pescadores < database_mysql.sql

# Se pedir senha, digite e confirme
# Após sucesso, verá:
# Query OK, X rows affected
```

---

## 4. Atualizar Arquivo `.env` do Backend

```env
# Antes (PostgreSQL/Supabase):
DATABASE_URL=postgresql://user:password@host:5432/database

# Depois (MySQL):
# Remova a linha acima e adicione:
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pi3_pescadores
DB_USER=root
DB_PASSWORD=sua_senha_aqui
DB_DIALECT=mysql
DB_POOL_MAX=5
DB_POOL_MIN=0
DB_POOL_IDLE=10000

# Outras variáveis (mantêm as mesmas):
PORT=3000
NODE_ENV=development
JWT_SECRET=sua_chave_jwt
JWT_EXPIRE=7d
SESSION_SECRET=sua_chave_session
```

**Exemplo completo:**
```env
# Servidor
PORT=3000
NODE_ENV=development

# Banco de Dados MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pi3_pescadores
DB_USER=root
DB_PASSWORD=root123
DB_DIALECT=mysql
DB_POOL_MAX=5
DB_POOL_MIN=0
DB_POOL_IDLE=10000

# JWT
JWT_SECRET=minha_chave_super_secreta_123
JWT_EXPIRE=7d

# Session
SESSION_SECRET=outra_chave_secreta_456

# Supabase (se ainda usar storage)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE=sua_service_role_key

# URLs
FRONTEND_URL=http://localhost:5173
```

---

## 5. Instalar Driver MySQL no Backend

```bash
# Na pasta backend/
cd backend

# Instalar mysql2
npm install mysql2

# Verificar se instalou
npm list mysql2
# Resultado: mysql2@latest
```

---

## 6. Atualizar Arquivo de Configuração Sequelize

### Localizar: `backend/src/config/loadEnv.js` ou `backend/src/database/config.js`

**Antes (PostgreSQL):**
```javascript
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DATABASE_URL,
  {
    dialect: 'postgres',
    pool: {
      max: 5,
      min: 0,
      idle: 10000
    }
  }
);

module.exports = sequelize;
```

**Depois (MySQL):**
```javascript
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 5,
      min: parseInt(process.env.DB_POOL_MIN) || 0,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timestamps: true,
    timezone: '-03:00' // Para São Paulo
  }
);

module.exports = sequelize;
```

---

## 7. Atualizar Models Sequelize (Se Necessário)

### ⚠️ Mudar DataTypes.UUID para VARCHAR(36)

**Se algum model usar UUID:**

```javascript
// ❌ ANTES (PostgreSQL)
const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // ... outros campos
});

// ✅ DEPOIS (MySQL)
const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => require('uuid').v4()
  },
  // ... outros campos
});
```

**Você precisa instalar uuid:**
```bash
npm install uuid
```

### Exemplo Completo de Model Convertido:

```javascript
// backend/src/database/models/Usuario.js
const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  const Usuario = sequelize.define('Usuario', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: uuidv4,
      comment: 'UUID como VARCHAR(36) para MySQL'
    },
    nome: {
      type: DataTypes.STRING(180),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(180),
      allowNull: false,
      unique: true
    },
    telefone: DataTypes.STRING(30),
    tipo_usuario: {
      type: DataTypes.ENUM('admin', 'cliente', 'funcionario'),
      defaultValue: 'cliente'
    },
    cpf: DataTypes.STRING(11),
    senha_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    ultimo_login_em: DataTypes.DATE
  }, {
    tableName: 'usuarios',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Associações
  Usuario.associate = (models) => {
    Usuario.hasMany(models.Pedido, { foreignKey: 'id_usuario' });
    Usuario.hasMany(models.Carrinho, { foreignKey: 'usuario_id' });
  };

  return Usuario;
};
```

---

## 8. Ajustar Queries de Criação de UUIDs

Se em algum controller/service você gera UUID para inserir:

```javascript
// ❌ ANTES (pode não funcionar no MySQL)
const { v4: uuidv4 } = require('uuid');

const novoUsuario = await Usuario.create({
  id: uuidv4(),  // ✅ Isso funciona
  nome: 'João',
  email: 'joao@example.com',
  // ...
});

// ✅ DEPOIS (melhor forma)
// Deixar o model gerar automaticamente via defaultValue
const novoUsuario = await Usuario.create({
  // NÃO passar 'id' aqui, deixar o model gerar
  nome: 'João',
  email: 'joao@example.com',
  // ...
});
```

---

## 9. Testar Conexão

```bash
# Dentro da pasta backend/
cd backend

# Criar arquivo de teste
cat > test-mysql.js << 'EOF'
const sequelize = require('./src/config/loadEnv.js');

sequelize.authenticate()
  .then(() => {
    console.log('✅ Conexão com MySQL bem-sucedida!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro ao conectar:', err);
    process.exit(1);
  });
EOF

# Executar teste
node test-mysql.js

# Resultado esperado: ✅ Conexão com MySQL bem-sucedida!
```

---

## 10. Sincronizar Models com Banco

```bash
# Dentro da pasta backend/

# Criar arquivo de sincronização
cat > sync-db.js << 'EOF'
const sequelize = require('./src/config/loadEnv.js');

// Importar models
const models = require('./src/database/models');

sequelize.sync({ alter: false, force: false })
  .then(() => {
    console.log('✅ Modelos sincronizados com sucesso!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro ao sincronizar:', err);
    process.exit(1);
  });
EOF

# Executar sincronização
node sync-db.js
```

---

## 11. Migrar Dados (Se Houver Dados Existentes)

### Opção A: Usar Ferramentas ETL

```bash
# Usando pgSQL2MySQL (requer instalação)
pip install pgsql2mysql

# Ou usar AWS DMS, Talend, Apache NiFi, etc.
```

### Opção B: Export/Import Manual

```bash
# 1. Exportar dados do PostgreSQL (do Supabase):
pg_dump -h seu-servidor.supabase.co -U postgres -d nome_db -a > dados_export.sql

# 2. Converter SQL (remover PG-específicos)
# Manualmente ou com ferramentas

# 3. Importar no MySQL:
mysql -u root -p pi3_pescadores < dados_export.sql
```

---

## 12. Executar Backend

```bash
# Dentro da pasta raiz do projeto
cd /c/Users/guibu/Desktop/PI3Pescadores

# Instalar dependências (se primeira vez)
npm install

# Iniciar backend e frontend
npm run dev

# Resultado esperado:
# > backend: npm run dev
# > frontend: npm run dev
# 
# ✅ Backend rodando em http://localhost:3000
# ✅ Frontend rodando em http://localhost:5173
```

---

## 13. Testar API

```bash
# Teste rápido (em outro terminal)

# Teste 1: GET (verificar se banco está conectado)
curl http://localhost:3000/api/produtos

# Teste 2: POST (criar usuário)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome":"Test User","email":"test@example.com","senha":"123456"}'

# Resultado esperado: 200/201 OK (não erro de conexão)
```

---

## 14. Troubleshooting

### Erro: "connect ECONNREFUSED 127.0.0.1:3306"
```
✗ MySQL não está rodando

Solução:
# Iniciar MySQL
mysql -u root -p

# Ou com Docker:
docker start pi3-mysql
```

### Erro: "Access denied for user 'root'@'localhost'"
```
✗ Senha incorreta no .env

Solução:
1. Verificar .env → DB_PASSWORD
2. Testar conexão manual:
   mysql -u root -p
   (Digite a senha usada)
```

### Erro: "Unknown database 'pi3_pescadores'"
```
✗ Banco não foi criado

Solução:
mysql -u root -p
CREATE DATABASE pi3_pescadores CHARACTER SET utf8mb4;
EXIT;

mysql -u root -p pi3_pescadores < database_mysql.sql
```

### Erro: "Dialect mysql not found"
```
✗ Driver mysql2 não instalado

Solução:
cd backend
npm install mysql2
npm install uuid (se usar UUID)
```

### Erro: "Access denied ... (using password: YES)"
```
✗ MySQL desabilitou conexão localhost

Solução:
1. Verificar .env:
   DB_HOST=localhost (não 127.0.0.1)
   
2. Ou usar 127.0.0.1:
   DB_HOST=127.0.0.1
```

---

## 15. Performance - Índices Já Criados

O script `database_mysql.sql` já inclui:
- ✅ Índices de PK/FK
- ✅ Índices em campos de busca comum
- ✅ Índices compostos para performance
- ✅ Constraints de integridade

**Nada adicional precisa ser feito!**

---

## 16. Checklist Final

```markdown
- [ ] MySQL instalado e rodando
- [ ] Banco de dados criado
- [ ] Script database_mysql.sql executado
- [ ] Driver mysql2 instalado (npm install mysql2)
- [ ] .env atualizado com credenciais MySQL
- [ ] Models Sequelize atualizados (se usar UUID)
- [ ] Arquivo de configuração Sequelize convertido
- [ ] Teste de conexão passou
- [ ] Backend inicializado sem erros
- [ ] Frontend consegue acessar API
- [ ] Testes de API funcionando (GET/POST)
- [ ] Views criadas e funcionando
- [ ] KPI configurações visíveis
- [ ] Backup do Supabase realizado (segurança)
```

---

## 🎯 Próximos Passos

1. **Após tudo pronto:**
   - [ ] Testar cada endpoint da API
   - [ ] Verificar integridade de dados
   - [ ] Validar performance com load test
   - [ ] Documentar customizações

2. **Otimizações Futuras:**
   - [ ] Adicionar caching (Redis) se necessário
   - [ ] Implementar replicação MySQL para backup
   - [ ] Usar connection pooling em produção
   - [ ] Implementar sharding se escalar muito

3. **Monitoramento:**
   - [ ] Configurar logs
   - [ ] Alertas de performance
   - [ ] Backup automático

---

## 📞 Checagem Rápida

```bash
# Tudo funcionando?
mysql -u root -p -e "USE pi3_pescadores; SHOW TABLES; SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'pi3_pescadores';"

# Backend iniciando OK?
cd backend && npm start
# Verifique se há erro de conexão

# Frontend acessando API?
# Abra http://localhost:5173 no navegador
# Verifique console (F12) por erros de API
```

✅ **Pronto para produção!**
