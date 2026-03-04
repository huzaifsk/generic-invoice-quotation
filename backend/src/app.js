const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { corsOrigins } = require('./config');

const isProduction = process.env.NODE_ENV === 'production';

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const companyRoutes = require('./routes/company.routes');
const clientsRoutes = require('./routes/clients.routes');
const catalogRoutes = require('./routes/catalog.routes');
const documentsRoutes = require('./routes/documents.routes');
const paymentsRoutes = require('./routes/payments.routes');
const creditNotesRoutes = require('./routes/credit-notes.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const activitiesRoutes = require('./routes/activities.routes');
const reportsRoutes = require('./routes/reports.routes');

const app = express();

const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function isAllowedDevOrigin(origin) {
  try {
    const parsed = new URL(origin);
    return ['localhost', '127.0.0.1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (corsOrigins.includes('*') || corsOrigins.includes(origin) || isAllowedDevOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

// Security & compression middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors(corsOptions));

// Body parser with limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging (dev only)
if (!isProduction) {
  app.use(morgan('dev'));
}

// Cache headers for static assets
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    // API responses: no cache
    res.set('Cache-Control', 'no-store, must-revalidate');
  }
  next();
});

// Connection timeout
app.set('request timeout', 30000);

app.get('/', (_req, res) => {
  res.json({ service: 'generic-invoice-quotation-backend', status: 'running' });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'generic-invoice-quotation-backend' });
});

app.get('/ping', (_req, res) => {
  // Ultra-fast response for health pings
  res.set('Cache-Control', 'no-store');
  res.json({ 
    ok: true, 
    ts: Date.now(),
    uptime: process.uptime()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/credit-notes', creditNotesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/reports', reportsRoutes);

app.use((err, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('REQUEST_ERROR', {
    message: err.message,
    path: req.url,
    method: req.method,
    statusCode: err.statusCode || 500,
    stack: err.stack,
  });
  const statusCode = Number(err.statusCode || 500);
  const message = statusCode >= 500 ? 'Internal server error.' : err.message;
  res.status(statusCode).json({ message });
});

module.exports = app;
module.exports.asyncRoute = asyncRoute;
