const path = require('path');
const loadEnv = require('./src/config/loadEnv');

// Load project-specific .env (overrides dotenv when necessary)
loadEnv(path.resolve(__dirname, '.env'), { override: false });

const app = require('./src/app');
const db = require('./src/database/models');

const port = Number(process.env.PORT) || 3000;

async function start() {
  await db.sequelize.authenticate();

  app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start backend');
  console.error(error);
  process.exitCode = 1;
});
