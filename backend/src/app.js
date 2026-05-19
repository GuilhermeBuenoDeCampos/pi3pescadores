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

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
