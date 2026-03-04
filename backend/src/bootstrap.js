const { validateRequiredConfig } = require('./config');
const { initDb } = require('./db/store');

let bootstrapPromise;

if (!global.__processGuardsInstalled) {
  process.on('unhandledRejection', (reason) => {
    // eslint-disable-next-line no-console
    console.error('UNHANDLED_REJECTION', { reason, stack: reason?.stack });
  });

  process.on('uncaughtException', (err) => {
    // eslint-disable-next-line no-console
    console.error('UNCAUGHT_EXCEPTION', { message: err.message, stack: err.stack });
  });

  global.__processGuardsInstalled = true;
}

function initializeBackend() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const bootStart = Date.now();
      // eslint-disable-next-line no-console
      console.log('BOOT_START');
      validateRequiredConfig();
      // eslint-disable-next-line no-console
      console.log('ENV_VALIDATED', { bootMs: Date.now() - bootStart });
      await initDb();
      // eslint-disable-next-line no-console
      console.log('DB_INITIALIZED', { bootMs: Date.now() - bootStart });
    })().catch((error) => {
      bootstrapPromise = null;
      // eslint-disable-next-line no-console
      console.error('BOOT_FAILED', { message: error.message, stack: error.stack });
      throw error;
    });
  }

  return bootstrapPromise;
}

module.exports = {
  initializeBackend,
};