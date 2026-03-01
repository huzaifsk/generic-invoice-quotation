const app = require('./app');
const { port } = require('./config');
const { initDb } = require('./db/store');

async function start() {
  try {
    await initDb();
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend running on http://localhost:${port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start backend:', error);
    process.exit(1);
  }
}

start();
