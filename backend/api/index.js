const app = require('../src/app');
const { initDb } = require('../src/db/store');

let initPromise;

function ensureDbReady() {
  if (!initPromise) {
    initPromise = initDb().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

module.exports = async function handler(req, res) {
  try {
    await ensureDbReady();
    return app(req, res);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Serverless startup failed:', error);
    return res.status(500).json({ message: 'Server initialization failed.' });
  }
};