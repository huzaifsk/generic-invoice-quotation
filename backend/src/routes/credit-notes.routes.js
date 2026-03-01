const express = require('express');
const { nanoid } = require('nanoid');
const { readDb, mutateDb } = require('../db/store');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { nextCreditNoteNumber } = require('../utils/sequence');
const { toNumber, sanitizeString } = require('../utils/validation');
const { calculateDocumentTotals } = require('../utils/finance');
const { DOCUMENT_TYPES } = require('../constants/workflow');
const { computeInvoiceStatusFromBalance } = require('../services/documents');
const { logActivity } = require('../utils/activity');
const { asyncRoute } = require('../utils/async-route');

const router = express.Router();
router.use(requireAuth);

router.get('/', requirePermission('creditnotes:read'), asyncRoute(async (req, res) => {
  const db = await readDb();
  const list = db.creditNotes.filter((row) => row.companyId === req.user.companyId);
  res.json(list);
}));

router.post('/', requirePermission('creditnotes:write'), asyncRoute(async (req, res) => {
  const { invoiceId, reason, amount } = req.body || {};
  const numericAmount = toNumber(amount, -1);
  if (!invoiceId || numericAmount <= 0 || !sanitizeString(reason)) {
    return res.status(400).json({ message: 'invoiceId, reason, amount are required.' });
  }

  const result = await mutateDb(async (db) => {
    const invoice = db.documents.find((doc) => doc.id === invoiceId && doc.companyId === req.user.companyId && doc.type === DOCUMENT_TYPES.INVOICE);
    if (!invoice) return { error: 'Invoice not found.' };

    const totals = calculateDocumentTotals(invoice);
    const outstanding = Math.max(0, totals.grandTotal - Number(invoice.paidAmount || 0) - Number(invoice.creditApplied || 0));
    if (numericAmount > outstanding) {
      return { error: `Credit amount exceeds outstanding (${outstanding.toFixed(2)}).` };
    }

    const now = new Date().toISOString();
    const creditNote = {
      id: `crn_${nanoid(12)}`,
      companyId: req.user.companyId,
      invoiceId,
      creditNoteNumber: nextCreditNoteNumber(db, req.user.companyId),
      reason: sanitizeString(reason),
      amount: numericAmount,
      createdBy: req.user.id,
      createdAt: now,
    };

    db.creditNotes.push(creditNote);

    invoice.creditApplied = Number(invoice.creditApplied || 0) + numericAmount;
    invoice.status = computeInvoiceStatusFromBalance(invoice);
    invoice.updatedAt = now;

    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'creditnote.created',
      entityType: 'creditnote',
      entityId: creditNote.id,
      metadata: { invoiceId, amount: numericAmount },
    });

    return { creditNote, invoice };
  });

  if (result.error) return res.status(400).json({ message: result.error });
  return res.status(201).json(result);
}));

module.exports = router;
