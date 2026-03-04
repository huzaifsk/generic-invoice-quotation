const { validateRequiredConfig } = require('./config');
const { initDb } = require('./db/store');

let bootstrapPromise;

function initializeBackend() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      validateRequiredConfig();
      await initDb();
    })().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }

  return bootstrapPromise;
}

module.exports = {
  initializeBackend,
};