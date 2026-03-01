const express = require('express');
const { nanoid } = require('nanoid');
const { readDb, mutateDb } = require('../db/store');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { isISODate, sanitizeString } = require('../utils/validation');
const { logActivity } = require('../utils/activity');
const { asyncRoute } = require('../utils/async-route');

const router = express.Router();
router.use(requireAuth);

router.get('/', requirePermission('notifications:read'), asyncRoute(async (req, res) => {
  const db = await readDb();
  const list = db.notifications.filter((n) => n.companyId === req.user.companyId);
  res.json(list);
}));

router.post('/schedule', requirePermission('notifications:write'), asyncRoute(async (req, res) => {
  const { eventType, channel, recipient, documentId, sendAt, payload } = req.body || {};
  if (!sanitizeString(eventType) || !sanitizeString(channel) || !sanitizeString(recipient) || !isISODate(sendAt)) {
    return res.status(400).json({ message: 'eventType, channel, recipient, and sendAt are required.' });
  }

  const notification = await mutateDb(async (db) => {
    const row = {
      id: `ntf_${nanoid(12)}`,
      companyId: req.user.companyId,
      eventType: sanitizeString(eventType),
      channel: sanitizeString(channel),
      recipient: sanitizeString(recipient),
      documentId: sanitizeString(documentId),
      sendAt,
      payload: payload && typeof payload === 'object' ? payload : {},
      status: 'scheduled',
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      sentAt: null,
    };

    db.notifications.push(row);

    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'notification.scheduled',
      entityType: 'notification',
      entityId: row.id,
      metadata: { eventType: row.eventType },
    });

    return row;
  });

  res.status(201).json(notification);
}));

router.post('/:id/dispatch', requirePermission('notifications:write'), asyncRoute(async (req, res) => {
  const result = await mutateDb(async (db) => {
    const row = db.notifications.find((n) => n.id === req.params.id && n.companyId === req.user.companyId);
    if (!row) return null;

    row.status = 'sent';
    row.sentAt = new Date().toISOString();

    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'notification.sent',
      entityType: 'notification',
      entityId: row.id,
      metadata: { eventType: row.eventType },
    });

    return row;
  });

  if (!result) return res.status(404).json({ message: 'Notification not found.' });
  res.json(result);
}));

module.exports = router;
