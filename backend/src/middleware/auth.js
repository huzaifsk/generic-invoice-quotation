const { readDb } = require('../db/store');
const { verifyToken } = require('../utils/token');
const { hasPermission } = require('../constants/permissions');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Missing access token.' });
    }

    const payload = verifyToken(token);
    const db = await readDb();
    const user = db.users.find((u) => u.id === payload.sub);

    if (!user) {
      return res.status(401).json({ message: 'Invalid access token.' });
    }

    req.user = user;
    next();
  } catch (_error) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }
    next();
  };
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const allowed = permissions.every((permission) => hasPermission(req.user.role, permission));
    if (!allowed) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
  requirePermission,
};
