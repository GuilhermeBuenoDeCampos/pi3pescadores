const path = require('path');
const loadEnv = require('../../config/loadEnv');

loadEnv(path.resolve(__dirname, '../../../.env'), { override: true });

const dialect = process.env.DB_DIALECT || 'postgres';
const defaultPort = dialect === 'mysql' ? 3306 : 5432;

const isRemotePostgres = (config) =>
  config.dialect === 'postgres' && config.host && config.host !== '127.0.0.1' && config.host !== 'localhost';

const sslOptions = {
  require: true,
  rejectUnauthorized: false,
};

const commonOptions = {
  dialect,
  define: {
    underscored: true,
    freezeTableName: true,
    timestamps: false,
  },
};

function withSsl(config) {
  if (!isRemotePostgres(config) && !process.env.DATABASE_URL?.includes('supabase.com')) {
    return config;
  }

  return {
    ...config,
    dialectOptions: {
      ...config.dialectOptions,
      ssl: sslOptions,
    },
  };
}

module.exports = {
  development: withSsl({
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME || 'pescadores_db',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || defaultPort,
    ...commonOptions,
  }),
  test: withSsl({
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME_TEST || 'pescadores_db_test',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || defaultPort,
    ...commonOptions,
  }),
  production: withSsl({
    ...(process.env.DATABASE_URL
      ? { use_env_variable: 'DATABASE_URL' }
      : {
          username: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || null,
          database: process.env.DB_NAME || 'pescadores_db',
          host: process.env.DB_HOST || '127.0.0.1',
          port: process.env.DB_PORT || defaultPort,
        }),
    ...commonOptions,
  }),
};
