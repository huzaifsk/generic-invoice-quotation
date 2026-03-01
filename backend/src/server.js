const app = require('./app');
const { port, mongoUri, mongoDbName } = require('./config');
const { initDb } = require('./db/store');

function getMaskedMongoTarget(uri, dbName) {
  const safeDbName = String(dbName || '').trim();

  try {
    const parsed = new URL(uri);
    const protocol = String(parsed.protocol || 'mongodb:').replace(':', '');
    const host = parsed.host || 'unknown-host';
    const uriDbName = String(parsed.pathname || '').replace(/^\//, '');
    const effectiveDbName = safeDbName || uriDbName || 'unknown-db';
    return `${protocol}://${host}/${effectiveDbName}`;
  } catch {
    const hostMatch = String(uri || '').match(/@([^/?]+)/);
    const host = hostMatch ? hostMatch[1] : 'unknown-host';
    const effectiveDbName = safeDbName || 'unknown-db';
    return `mongodb://${host}/${effectiveDbName}`;
  }
}

async function start() {
  try {
    await initDb();
    const mongoTarget = getMaskedMongoTarget(mongoUri, mongoDbName);
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend running on http://localhost:${port}`);
      // eslint-disable-next-line no-console
      console.log(`Mongo target: ${mongoTarget}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start backend:', error);
    process.exit(1);
  }
}

start();
