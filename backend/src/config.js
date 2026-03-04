const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

function parseCorsOrigins(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGIN || 'http://localhost:5173');
const mongoUri = String(process.env.MONGODB_URI || '').trim();

function required(envName) {
  const value = String(process.env[envName] || '').trim();
  if (!value) {
    const error = new Error(`${envName} is required. Please set it in environment variables.`);
    error.statusCode = 500;
    throw error;
  }
  return value;
}

function validateRequiredConfig() {
  try {
    required('MONGODB_URI');
    required('JWT_SECRET');
    const port = Number(process.env.PORT || 4000);
    if (port < 1 || port > 65535) throw new Error('PORT must be 1-65535');
    // eslint-disable-next-line no-console
    console.log('CONFIG_VALIDATED', { mongoHost: mongoUri.match(/@([^/]+)/)?.[1] || 'unknown', dbName: process.env.MONGODB_DB_NAME });
  } catch (error) {
    error.statusCode = 500;
    throw error;
  }
}

module.exports = {
  port: Number(process.env.PORT || 4000),
  corsOrigins,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mongoUri,
  mongoDbName: process.env.MONGODB_DB_NAME || 'generic_invoice_quotation',
  dbFile: path.join(__dirname, '..', '..', 'data', 'db.json'),
  validateRequiredConfig,
};
