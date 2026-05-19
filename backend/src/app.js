const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

function normalizeOrigin(origin) {
  const value = String(origin || '').trim().replace(/\/+$/, '');

  if (!value) {
    return '';
  }

  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
}

function parseOrigins(value) {
  return String(value || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
}

const allowedOrigins = new Set([
  'https://pi3pescadores.onrender.com',
  'https://pi3pescadores.pages.dev',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
  ...parseOrigins(process.env.FRONTEND_URL),
  ...parseOrigins(process.env.FRONTEND_URLS),
  ...parseOrigins(process.env.CORS_ORIGINS),
  ...parseOrigins(process.env.API_URL),
]);

console.info(`[cors] Allowed origins: ${[...allowedOrigins].join(', ')}`);

const corsOptions = {
  origin(origin, callback) {
    // Requests without Origin are server-to-server, curl, health checks or same-origin.
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (allowedOrigins.has(normalizedOrigin)) {
      return callback(null, true);
    }

    console.warn(`[cors] Blocked origin: ${origin}. Allowed origins: ${[...allowedOrigins].join(', ')}`);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-Token', 'x-guest-token', 'accept', 'accept-language'],
  exposedHeaders: ['Content-Length', 'Date'],
  optionsSuccessStatus: 204,
  preflightContinue: false,
};

app.use(cors(corsOptions));

// Middleware adicional para garantir headers CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(normalizeOrigin(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Guest-Token,x-guest-token,Accept,Accept-Language');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'pi3-pescadores-backend',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/models', (req, res) => {
  const db = require('./database/models');
  const models = Object.keys(db)
    .filter((key) => key !== 'sequelize' && key !== 'Sequelize')
    .map((key) => ({
      name: key,
      type: typeof db[key],
      hasAssociate: typeof db[key].associate === 'function',
    }));

  res.json({
    ok: true,
    modelsLoaded: models.length,
    models,
    sequelizeConnected: !!db.sequelize,
    timestamp: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.warn(`[dev] ${req.method} ${req.originalUrl}`);
    return next();
  });
}

// Endpoint de teste para debug de pedidos
app.get('/test/pedidos-count', async (req, res) => {
  try {
    const db = require('./database/models');
    if (!db.Pedido) {
      return res.status(500).json({
        error: 'Model Pedido not found',
        modelsLoaded: Object.keys(db).filter((k) => k !== 'sequelize' && k !== 'Sequelize'),
      });
    }

    const count = await db.Pedido.count();
    const sample = await db.Pedido.findAll({ limit: 1 });

    res.json({
      success: true,
      pedidoCount: count,
      samplePedido: sample.length > 0 ? sample[0].toJSON() : null,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });
  }
});

app.get('/test/pedidos-debug/:usuarioId', async (req, res) => {
  try {
    const db = require('./database/models');
    const { usuarioId } = req.params;

    if (!db.Pedido) {
      return res.status(500).json({ 
        error: 'Model Pedido not found',
        modelsLoaded: Object.keys(db).filter((k) => k !== 'sequelize' && k !== 'Sequelize')
      });
    }

    // Tentar a mesma query que listarPedidosDoUsuario
    const { count, rows } = await db.Pedido.findAndCountAll({
      where: { id_usuario: usuarioId },
      distinct: true,
      order: [['criado_em', 'DESC']],
      limit: 8,
      offset: 0,
    });

    res.json({
      success: true,
      usuarioId,
      totalPedidos: count,
      pedidosRetornados: rows.length,
      firstPedido: rows.length > 0 ? rows[0].toJSON() : null,
    });
  } catch (error) {
    console.error('[test/pedidos-debug] erro:', {
      message: error.message,
      code: error.code,
      errorName: error.name,
      original: error.original?.message,
    });

    res.status(500).json({
      error: error.message,
      errorType: error.constructor.name,
      errorCode: error.code,
      errorName: error.name,
      originalError: error.original?.message || null,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });
  }
});

app.get('/test/db-tables', async (req, res) => {
  try {
    const db = require('./database/models');
    
    // Tentar listar as tabelas do banco de dados
    const tables = await db.sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `, { type: db.sequelize.QueryTypes.SELECT });

    res.json({
      success: true,
      tablesCount: tables.length,
      tables: tables.map(t => t.table_name),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      hint: 'Se este endpoint falhar, o banco de dados não está acessível',
    });
  }
});

app.get('/test/sequelize-check', async (req, res) => {
  try {
    const db = require('./database/models');
    
    // Testar conexão com banco
    await db.sequelize.authenticate();
    
    // Verificar modelos
    const models = Object.keys(db)
      .filter((k) => k !== 'sequelize' && k !== 'Sequelize')
      .map((name) => {
        const model = db[name];
        return {
          name,
          tableName: model.tableName || 'unknown',
          hasAssociate: typeof model.associate === 'function',
        };
      });

    res.json({
      success: true,
      dbConnected: true,
      modelsLoaded: models.length,
      models,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      dbConnected: false,
    });
  }
});

app.get('/test/check-pedidos-table', async (req, res) => {
  try {
    const db = require('./database/models');
    
    // Verificar se a tabela exists
    const result = await db.sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'pedidos'
      ) as exists
    `, { type: db.sequelize.QueryTypes.SELECT });

    const tableExists = result[0].exists;

    if (!tableExists) {
      return res.status(400).json({
        success: false,
        tableExists: false,
        message: 'Tabela "pedidos" não existe no banco de dados. A migração pode não ter sido executada.',
        suggestion: 'Execute: npm run db:migrate',
      });
    }

    // Se existe, tentar contar
    const count = await db.sequelize.query('SELECT COUNT(*) as count FROM pedidos', {
      type: db.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      tableExists: true,
      pedidosCount: parseInt(count[0].count, 10),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      errorType: error.constructor.name,
      suggestion: 'Verifique se o banco de dados está acessível',
    });
  }
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
