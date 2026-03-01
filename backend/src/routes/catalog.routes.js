const express = require('express');
const { nanoid } = require('nanoid');
const { readDb, mutateDb } = require('../db/store');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { sanitizeString, toNumber } = require('../utils/validation');
const { logActivity } = require('../utils/activity');
const { asyncRoute } = require('../utils/async-route');

const router = express.Router();
router.use(requireAuth);

router.get('/', requirePermission('catalog:read'), asyncRoute(async (req, res) => {
  const db = await readDb();
  const items = db.catalogItems.filter((item) => item.companyId === req.user.companyId && item.deletedAt == null);
  res.json(items);
}));

router.post('/', requirePermission('catalog:write'), asyncRoute(async (req, res) => {
  const {
    sku,
    name,
    description,
    costPrice,
    sellPrice,
    taxPercent,
    unit,
    defaultDiscountPercent,
    isService,
    bundleItems,
  } = req.body || {};

  if (!sanitizeString(name)) {
    return res.status(400).json({ message: 'name is required.' });
  }

  const now = new Date().toISOString();
  const item = await mutateDb(async (db) => {
    const newItem = {
      id: `cat_${nanoid(12)}`,
      companyId: req.user.companyId,
      sku: sanitizeString(sku) || `SKU-${nanoid(8).toUpperCase()}`,
      name: sanitizeString(name),
      description: sanitizeString(description),
      costPrice: toNumber(costPrice, 0),
      sellPrice: toNumber(sellPrice, 0),
      taxPercent: toNumber(taxPercent, 0),
      unit: sanitizeString(unit) || 'unit',
      defaultDiscountPercent: toNumber(defaultDiscountPercent, 0),
      isService: Boolean(isService),
      bundleItems: Array.isArray(bundleItems) ? bundleItems : [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    db.catalogItems.push(newItem);
    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'catalog.create',
      entityType: 'catalog',
      entityId: newItem.id,
      metadata: { sku: newItem.sku },
    });
    return newItem;
  });

  res.status(201).json(item);
}));

router.put('/:id', requirePermission('catalog:write'), asyncRoute(async (req, res) => {
  const payload = req.body || {};

  const item = await mutateDb(async (db) => {
    const target = db.catalogItems.find((c) => c.id === req.params.id && c.companyId === req.user.companyId && c.deletedAt == null);
    if (!target) return null;

    const assignable = ['sku', 'name', 'description', 'unit'];
    for (const key of assignable) {
      if (payload[key] !== undefined) {
        target[key] = sanitizeString(payload[key]);
      }
    }
    if (payload.costPrice !== undefined) target.costPrice = toNumber(payload.costPrice, target.costPrice);
    if (payload.sellPrice !== undefined) target.sellPrice = toNumber(payload.sellPrice, target.sellPrice);
    if (payload.taxPercent !== undefined) target.taxPercent = toNumber(payload.taxPercent, target.taxPercent);
    if (payload.defaultDiscountPercent !== undefined) target.defaultDiscountPercent = toNumber(payload.defaultDiscountPercent, target.defaultDiscountPercent);
    if (payload.isService !== undefined) target.isService = Boolean(payload.isService);
    if (payload.bundleItems !== undefined) target.bundleItems = Array.isArray(payload.bundleItems) ? payload.bundleItems : [];

    target.updatedAt = new Date().toISOString();
    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'catalog.update',
      entityType: 'catalog',
      entityId: target.id,
      metadata: {},
    });

    return target;
  });

  if (!item) return res.status(404).json({ message: 'Catalog item not found.' });
  return res.json(item);
}));

router.delete('/:id', requirePermission('catalog:write'), asyncRoute(async (req, res) => {
  const deleted = await mutateDb(async (db) => {
    const target = db.catalogItems.find((c) => c.id === req.params.id && c.companyId === req.user.companyId && c.deletedAt == null);
    if (!target) return false;

    target.deletedAt = new Date().toISOString();
    target.updatedAt = target.deletedAt;

    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'catalog.delete',
      entityType: 'catalog',
      entityId: target.id,
      metadata: {},
    });

    return true;
  });

  if (!deleted) return res.status(404).json({ message: 'Catalog item not found.' });
  return res.status(204).send();
}));

module.exports = router;
