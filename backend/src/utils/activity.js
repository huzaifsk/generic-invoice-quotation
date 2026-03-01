const { nanoid } = require('nanoid');

function logActivity(db, { companyId, userId, action, entityType, entityId, metadata }) {
  db.activities.push({
    id: `act_${nanoid(12)}`,
    companyId,
    userId,
    action,
    entityType,
    entityId,
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
  });
}

module.exports = { logActivity };
