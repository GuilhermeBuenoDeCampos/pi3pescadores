const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

function parseOrigins(value) {
  return String(value || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
}

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://pi3pescadores.pages.dev',
  ...parseOrigins(process.env.FRONTEND_URL),
  ...parseOrigins(process.env.FRONTEND_URLS),
  ...parseOrigins(process.env.CORS_ORIGINS),
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
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

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

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.warn(`[dev] ${req.method} ${req.originalUrl}`);
    return next();
  });
}

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
