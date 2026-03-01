const express = require('express');
const { nanoid } = require('nanoid');
const { readDb, mutateDb } = require('../db/store');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { nextPaymentReceiptNumber } = require('../utils/sequence');
const { calculateDocumentTotals } = require('../utils/finance');
const { DOCUMENT_TYPES, INVOICE_STATUS } = require('../constants/workflow');
const { toNumber, sanitizeString, isISODate } = require('../utils/validation');
const { logActivity } = require('../utils/activity');
const { computeInvoiceStatusFromBalance } = require('../services/documents');
const { asyncRoute } = require('../utils/async-route');

const router = express.Router();
router.use(requireAuth);

router.get('/', requirePermission('payments:read'), asyncRoute(async (req, res) => {
  const db = await readDb();
  const { invoiceId } = req.query;
  let payments = db.payments.filter((payment) => payment.companyId === req.user.companyId);
  if (invoiceId) payments = payments.filter((payment) => payment.invoiceId === invoiceId);
  res.json(payments);
}));

router.post('/', requirePermission('payments:write'), asyncRoute(async (req, res) => {
  const { invoiceId, amount, method, referenceId, paidDate, notes } = req.body || {};
  const numericAmount = toNumber(amount, -1);

  if (!invoiceId || numericAmount <= 0 || !sanitizeString(method)) {
    return res.status(400).json({ message: 'invoiceId, amount, and method are required.' });
  }

  if (paidDate && !isISODate(paidDate)) {
    return res.status(400).json({ message: 'paidDate must be YYYY-MM-DD.' });
  }

  const result = await mutateDb(async (db) => {
    const invoice = db.documents.find((doc) => doc.id === invoiceId && doc.companyId === req.user.companyId && doc.type === DOCUMENT_TYPES.INVOICE);
    if (!invoice) return { error: 'Invoice not found.' };
    if (invoice.status === INVOICE_STATUS.CANCELLED) return { error: 'Cannot record payment for a cancelled invoice.' };

    const totals = calculateDocumentTotals(invoice);
    const alreadyPaid = toNumber(invoice.paidAmount, 0);
    const creditApplied = toNumber(invoice.creditApplied, 0);
    const outstanding = Math.max(0, totals.grandTotal - alreadyPaid - creditApplied);

    if (numericAmount > outstanding) {
      return { error: `Payment exceeds outstanding amount (${outstanding.toFixed(2)}).` };
    }

    const now = new Date().toISOString();
    const payment = {
      id: `pay_${nanoid(12)}`,
      companyId: req.user.companyId,
      invoiceId,
      amount: numericAmount,
      method: sanitizeString(method),
      referenceId: sanitizeString(referenceId),
      paidDate: paidDate || now.slice(0, 10),
      receiptNumber: nextPaymentReceiptNumber(db, req.user.companyId),
      notes: sanitizeString(notes),
      createdBy: req.user.id,
      createdAt: now,
    };

    db.payments.push(payment);

    invoice.paidAmount = alreadyPaid + numericAmount;
    invoice.status = computeInvoiceStatusFromBalance(invoice);
    invoice.updatedAt = now;

    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'payment.recorded',
      entityType: 'payment',
      entityId: payment.id,
      metadata: { invoiceId: invoice.id, amount: payment.amount },
    });

    return { payment, invoice };
  });

  if (result.error) return res.status(400).json({ message: result.error });
  return res.status(201).json(result);
}));

router.get('/:id/receipt', requirePermission('payments:read'), asyncRoute(async (req, res) => {
  const db = await readDb();
  const payment = db.payments.find((row) => row.id === req.params.id && row.companyId === req.user.companyId);
  if (!payment) return res.status(404).json({ message: 'Payment not found.' });

  const invoice = db.documents.find((doc) => doc.id === payment.invoiceId && doc.companyId === req.user.companyId);
  const company = db.companies.find((c) => c.id === req.user.companyId);

  return res.json({
    receipt: {
      receiptNumber: payment.receiptNumber,
      payment,
      invoice,
      company,
      generatedAt: new Date().toISOString(),
    },
  });
}));

module.exports = router;
