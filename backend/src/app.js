const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.API_URL,
  'https://pi3pescadores.onrender.com',
  'https://pi3pescadores.onrender.com/',
  'https://pi3pescadores.pages.dev',
  'https://pi3pescadores.pages.dev/',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
].filter(Boolean);

const app = express();

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-Token'],
}));

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
