const path = require('path');
const loadEnv = require('./src/config/loadEnv');

// Load project-specific .env (overrides dotenv when necessary)
loadEnv(path.resolve(__dirname, '.env'), { override: true });

const app = require('./src/app');

const port = Number(process.env.PORT) || 3000;

async function start() {
  app.listen(port, async () => {
    console.log(`Backend running on port ${port}`);

    try {
      const db = require('./src/database/models');
      await db.sequelize.authenticate();
      console.log('Database connection established');

      const { startCarrinhoAbandonoJob } = require('./src/jobs/carrinhoAbandonoJob');
      startCarrinhoAbandonoJob();
    } catch (error) {
      console.error('Database connection failed after server start');
      console.error(error);
    }
  });
}

start().catch((error) => {
  console.error('Failed to start backend');
  console.error(error);
  process.exitCode = 1;
});
