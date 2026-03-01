const express = require('express');
const { nanoid } = require('nanoid');
const { readDb, mutateDb } = require('../db/store');
const { hashPassword } = require('../utils/password');
const { pickUserSafe } = require('../utils/http');
const { requireAuth, requireRole } = require('../middleware/auth');
const { VALID_ROLES, ROLES } = require('../constants/permissions');
const { isValidEmail, normalizeEmail, sanitizeString } = require('../utils/validation');
const { logActivity } = require('../utils/activity');
const { asyncRoute } = require('../utils/async-route');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(ROLES.ADMIN, ROLES.MANAGER));

router.get('/', asyncRoute(async (req, res) => {
  const db = await readDb();
  const users = db.users
    .filter((u) => u.companyId === req.user.companyId)
    .map(pickUserSafe);

  res.json(users);
}));

router.post('/', asyncRoute(async (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!sanitizeString(name) || !isValidEmail(email) || !password || !role) {
    return res.status(400).json({ message: 'name, email, password, and role are required.' });
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: 'Invalid role.' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  const normalizedEmail = normalizeEmail(email);
  const db = await readDb();
  const exists = db.users.some((u) => u.email === normalizedEmail);
  if (exists) {
    return res.status(409).json({ message: 'Email already exists.' });
  }

  const passwordHash = await hashPassword(String(password));
  const now = new Date().toISOString();

  const user = await mutateDb(async (dbMut) => {
    const newUser = {
      id: `usr_${nanoid(12)}`,
      companyId: req.user.companyId,
      name: sanitizeString(name),
      email: normalizedEmail,
      passwordHash,
      role,
      createdAt: now,
      updatedAt: now,
    };

    dbMut.users.push(newUser);
    logActivity(dbMut, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'user.create',
      entityType: 'user',
      entityId: newUser.id,
      metadata: { role: newUser.role },
    });
    return newUser;
  });

  res.status(201).json(pickUserSafe(user));
}));

router.patch('/:id/role', asyncRoute(async (req, res) => {
  const { role } = req.body || {};
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: 'Invalid role.' });
  }

  const updated = await mutateDb(async (db) => {
    const target = db.users.find((u) => u.id === req.params.id && u.companyId === req.user.companyId);
    if (!target) return null;

    target.role = role;
    target.updatedAt = new Date().toISOString();

    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'user.role.update',
      entityType: 'user',
      entityId: target.id,
      metadata: { role },
    });

    return target;
  });

  if (!updated) {
    return res.status(404).json({ message: 'User not found.' });
  }

  res.json(pickUserSafe(updated));
}));

module.exports = router;
