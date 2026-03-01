const express = require('express');
const { mutateDb, readDb } = require('../db/store');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { sanitizeString, toNumber } = require('../utils/validation');
const { logActivity } = require('../utils/activity');
const { asyncRoute } = require('../utils/async-route');

const router = express.Router();

router.use(requireAuth);

router.get('/me', asyncRoute(async (req, res) => {
  const db = await readDb();
  const company = db.companies.find((c) => c.id === req.user.companyId) || null;
  res.json(company);
}));

router.put('/me', requirePermission('clients:write'), asyncRoute(async (req, res) => {
  const {
    name,
    trn,
    vatPercent,
    logo,
    currency,
    paymentTermsDays,
    defaultTaxPercent,
    approvalThreshold,
    templates,
  } = req.body || {};

  const updated = await mutateDb(async (db) => {
    const company = db.companies.find((c) => c.id === req.user.companyId);
    if (!company) return null;

    if (name !== undefined) company.name = sanitizeString(name);
    if (trn !== undefined) company.trn = sanitizeString(trn);
    if (vatPercent !== undefined) company.vatPercent = toNumber(vatPercent, company.vatPercent);
    if (logo !== undefined) company.logo = String(logo || '');
    if (currency !== undefined) company.currency = sanitizeString(currency) || company.currency;
    if (paymentTermsDays !== undefined) company.paymentTermsDays = toNumber(paymentTermsDays, company.paymentTermsDays || 30);
    if (defaultTaxPercent !== undefined) company.defaultTaxPercent = toNumber(defaultTaxPercent, company.defaultTaxPercent || 5);
    if (approvalThreshold !== undefined) company.approvalThreshold = toNumber(approvalThreshold, company.approvalThreshold || 10000);

    if (templates && typeof templates === 'object') {
      company.templates = {
        ...(company.templates || {}),
        ...templates,
      };
    }

    company.updatedAt = new Date().toISOString();

    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'company.update',
      entityType: 'company',
      entityId: company.id,
      metadata: {},
    });

    return company;
  });

  if (!updated) {
    return res.status(404).json({ message: 'Company not found.' });
  }

  res.json(updated);
}));

module.exports = router;
