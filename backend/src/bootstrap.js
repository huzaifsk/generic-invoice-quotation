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
      const startTime = new Date().toISOString();
      // eslint-disable-next-line no-console
      console.log('BOOT_PHASE_START CONFIG_VALIDATION', { timestamp: startTime });
      validateRequiredConfig();
      const configMs = Date.now() - bootStart;
      // eslint-disable-next-line no-console
      console.log('BOOT_PHASE_END CONFIG_VALIDATION', { durationMs: configMs });

      // eslint-disable-next-line no-console
      console.log('BOOT_PHASE_START DB_INITIALIZATION', { timestamp: new Date().toISOString() });
      await initDb();
      const dbMs = Date.now() - bootStart;
      // eslint-disable-next-line no-console
      console.log('BOOT_PHASE_END DB_INITIALIZATION', { totalBootMs: dbMs });
    })().catch((error) => {
      bootstrapPromise = null;
      // eslint-disable-next-line no-console
      console.error('BOOT_FAILED_ERROR', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      throw error;
    });
  }

  return bootstrapPromise;
}

module.exports = {
  initializeBackend,
};