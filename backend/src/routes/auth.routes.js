const express = require('express');
const { nanoid } = require('nanoid');
const { mutateDb, readDb } = require('../db/store');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/token');
const { pickUserSafe } = require('../utils/http');
const { requireAuth } = require('../middleware/auth');
const { ROLES } = require('../constants/permissions');
const { isValidEmail, normalizeEmail, sanitizeString, assert } = require('../utils/validation');
const { logActivity } = require('../utils/activity');
const { asyncRoute } = require('../utils/async-route');

const router = express.Router();

router.post('/signup', asyncRoute(async (req, res, next) => {
  try {
    const { name, email, password, companyName } = req.body || {};

    assert(sanitizeString(name).length >= 2, 'name is required and must be at least 2 characters.');
    assert(isValidEmail(email), 'email is invalid.');
    assert(String(password || '').length >= 8, 'Password must be at least 8 characters.');

    const normalizedEmail = normalizeEmail(email);
    const userExists = (await readDb()).users.some((u) => u.email === normalizedEmail);
    if (userExists) {
      return res.status(409).json({ message: 'Email already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    const payload = await mutateDb(async (db) => {
      const companyId = `cmp_${nanoid(12)}`;
      const userId = `usr_${nanoid(12)}`;

      const company = {
        id: companyId,
        name: sanitizeString(companyName) || `${sanitizeString(name)} Company`,
        logo: '',
        trn: '',
        vatPercent: 5,
        currency: 'AED',
        paymentTermsDays: 30,
        defaultTaxPercent: 5,
        approvalThreshold: 10000,
        templates: {
          quote: 'default',
          invoice: 'default',
          brandColor: '#0f172a',
        },
        createdAt: now,
        updatedAt: now,
      };

      const user = {
        id: userId,
        companyId,
        name: sanitizeString(name),
        email: normalizedEmail,
        passwordHash,
        role: ROLES.ADMIN,
        createdAt: now,
        updatedAt: now,
      };

      db.companies.push(company);
      db.users.push(user);

      logActivity(db, {
        companyId,
        userId,
        action: 'auth.signup',
        entityType: 'user',
        entityId: userId,
        metadata: { email: normalizedEmail },
      });

      return { user, company };
    });

    const token = signToken({ sub: payload.user.id, role: payload.user.role, companyId: payload.user.companyId });

    return res.status(201).json({
      token,
      user: pickUserSafe(payload.user),
      company: payload.company,
    });
  } catch (error) {
    return next(error);
  }
}));

router.post('/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body || {};

  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ message: 'email and password are required.' });
  }

  const normalizedEmail = normalizeEmail(email);
  const db = await readDb();
  const user = db.users.find((u) => u.email === normalizedEmail);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const isValid = await comparePassword(String(password), user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const company = db.companies.find((c) => c.id === user.companyId) || null;
  const token = signToken({ sub: user.id, role: user.role, companyId: user.companyId });

  return res.json({
    token,
    user: pickUserSafe(user),
    company,
  });
}));

router.get('/me', requireAuth, asyncRoute(async (req, res) => {
  const db = await readDb();
  const company = db.companies.find((c) => c.id === req.user.companyId) || null;
  return res.json({
    user: pickUserSafe(req.user),
    company,
  });
}));

module.exports = router;
