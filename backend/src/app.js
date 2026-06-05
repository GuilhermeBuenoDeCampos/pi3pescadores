const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const captureClientInfo = require('./middlewares/captureClientInfo');

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

function isAllowedOrigin(origin) {
  const normalizedOrigin = normalizeOrigin(origin);

  if (allowedOrigins.has(normalizedOrigin)) {
    return true;
  }

  try {
    const { hostname, protocol } = new URL(normalizedOrigin);

    if (protocol === 'http:' && ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname)) {
      return true;
    }

    if (protocol === 'https:' && (hostname === 'pages.dev' || hostname.endsWith('.pages.dev'))) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

console.info(`[cors] Allowed origins: ${[...allowedOrigins].join(', ')}`);

const corsOptions = {
  origin(origin, callback) {
    // Requests without Origin are server-to-server, curl, health checks or same-origin.
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (isAllowedOrigin(normalizedOrigin)) {
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
  if (origin && isAllowedOrigin(origin)) {
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
app.use(captureClientInfo);

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
