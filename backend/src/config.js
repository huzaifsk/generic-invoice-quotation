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

if (!mongoUri) {
  throw new Error('MONGODB_URI is required. Please set it in backend/.env');
}

module.exports = {
  port: Number(process.env.PORT || 4000),
  corsOrigins,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mongoUri,
  mongoDbName: process.env.MONGODB_DB_NAME || 'generic_invoice_quotation',
  dbFile: path.join(__dirname, '..', '..', 'data', 'db.json'),
};
