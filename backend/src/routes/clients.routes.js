const express = require('express');
const { nanoid } = require('nanoid');
const { readDb, mutateDb } = require('../db/store');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { isValidEmail, normalizeEmail, sanitizeString, toNumber } = require('../utils/validation');
const { logActivity } = require('../utils/activity');
const { asyncRoute } = require('../utils/async-route');

const router = express.Router();
router.use(requireAuth);

router.get('/', requirePermission('clients:read'), asyncRoute(async (req, res) => {
  const db = await readDb();
  const clients = db.clients.filter((c) => c.companyId === req.user.companyId);
  res.json(clients);
}));

router.post('/', requirePermission('clients:write'), asyncRoute(async (req, res) => {
  const {
    name,
    email,
    address,
    gstVatNumber,
    contactPersons,
    paymentTermsDays,
    currency,
    defaultTaxPercent,
    leadSource,
    notes,
    tags,
  } = req.body || {};

  if (!sanitizeString(name) || !isValidEmail(email) || !sanitizeString(address)) {
    return res.status(400).json({ message: 'name, email, and address are required.' });
  }

  const now = new Date().toISOString();
  const client = await mutateDb(async (db) => {
    const newClient = {
      id: `cli_${nanoid(12)}`,
      companyId: req.user.companyId,
      name: sanitizeString(name),
      email: normalizeEmail(email),
      address: sanitizeString(address),
      gstVatNumber: sanitizeString(gstVatNumber),
      contactPersons: Array.isArray(contactPersons) ? contactPersons : [],
      paymentTermsDays: toNumber(paymentTermsDays, 30),
      currency: sanitizeString(currency) || 'AED',
      defaultTaxPercent: toNumber(defaultTaxPercent, 5),
      leadSource: sanitizeString(leadSource),
      notes: sanitizeString(notes),
      tags: Array.isArray(tags) ? tags.map((tag) => sanitizeString(tag)).filter(Boolean) : [],
      createdAt: now,
      updatedAt: now,
    };

    db.clients.push(newClient);

    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'client.create',
      entityType: 'client',
      entityId: newClient.id,
      metadata: {},
    });

    return newClient;
  });

  res.status(201).json(client);
}));

router.put('/:id', requirePermission('clients:write'), asyncRoute(async (req, res) => {
  const payload = req.body || {};

  const client = await mutateDb(async (db) => {
    const target = db.clients.find((c) => c.id === req.params.id && c.companyId === req.user.companyId);
    if (!target) return null;

    if (payload.name !== undefined) target.name = sanitizeString(payload.name);
    if (payload.email !== undefined) {
      if (!isValidEmail(payload.email)) throw Object.assign(new Error('Invalid email address.'), { statusCode: 400 });
      target.email = normalizeEmail(payload.email);
    }
    if (payload.address !== undefined) target.address = sanitizeString(payload.address);
    if (payload.gstVatNumber !== undefined) target.gstVatNumber = sanitizeString(payload.gstVatNumber);
    if (payload.contactPersons !== undefined) target.contactPersons = Array.isArray(payload.contactPersons) ? payload.contactPersons : [];
    if (payload.paymentTermsDays !== undefined) target.paymentTermsDays = toNumber(payload.paymentTermsDays, target.paymentTermsDays || 30);
    if (payload.currency !== undefined) target.currency = sanitizeString(payload.currency) || target.currency;
    if (payload.defaultTaxPercent !== undefined) target.defaultTaxPercent = toNumber(payload.defaultTaxPercent, target.defaultTaxPercent || 5);
    if (payload.leadSource !== undefined) target.leadSource = sanitizeString(payload.leadSource);
    if (payload.notes !== undefined) target.notes = sanitizeString(payload.notes);
    if (payload.tags !== undefined) target.tags = Array.isArray(payload.tags) ? payload.tags.map((tag) => sanitizeString(tag)).filter(Boolean) : [];

    target.updatedAt = new Date().toISOString();

    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'client.update',
      entityType: 'client',
      entityId: target.id,
      metadata: {},
    });

    return target;
  });

  if (!client) {
    return res.status(404).json({ message: 'Client not found.' });
  }

  res.json(client);
}));

router.delete('/:id', requirePermission('clients:write'), asyncRoute(async (req, res) => {
  const deleted = await mutateDb(async (db) => {
    const index = db.clients.findIndex((c) => c.id === req.params.id && c.companyId === req.user.companyId);
    if (index === -1) return false;

    const [removed] = db.clients.splice(index, 1);

    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'client.delete',
      entityType: 'client',
      entityId: removed.id,
      metadata: {},
    });

    return true;
  });

  if (!deleted) {
    return res.status(404).json({ message: 'Client not found.' });
  }

  res.status(204).send();
}));

module.exports = router;
