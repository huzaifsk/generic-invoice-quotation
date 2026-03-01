const express = require('express');
const { readDb } = require('../db/store');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { asyncRoute } = require('../utils/async-route');

const router = express.Router();
router.use(requireAuth);

router.get('/', requirePermission('activities:read'), asyncRoute(async (req, res) => {
  const db = await readDb();
  const { entityType, entityId, action, limit } = req.query;

  let rows = db.activities
    .filter((row) => row.companyId === req.user.companyId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (entityType) rows = rows.filter((row) => row.entityType === entityType);
  if (entityId) rows = rows.filter((row) => row.entityId === entityId);
  if (action) rows = rows.filter((row) => row.action === action);

  const cap = Math.min(500, Number(limit || 100));
  return res.json(rows.slice(0, cap));
}));

module.exports = router;
