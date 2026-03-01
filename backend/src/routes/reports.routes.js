const express = require('express');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { readDb } = require('../db/store');
const { calculateDocumentTotals } = require('../utils/finance');
const { DOCUMENT_TYPES, QUOTATION_STATUS } = require('../constants/workflow');
const { asyncRoute } = require('../utils/async-route');

const router = express.Router();
router.use(requireAuth);
router.use(requirePermission('reports:read'));

function monthBuckets(monthCount = 12) {
  const monthlyRevenue = [];
  const now = new Date();
  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyRevenue.push({
      name: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      revenue: 0,
    });
  }
  return monthlyRevenue;
}

router.get('/overview', asyncRoute(async (req, res) => {
  const db = await readDb();
  const docs = db.documents.filter((d) => d.companyId === req.user.companyId);
  const invoices = docs.filter((d) => d.type === DOCUMENT_TYPES.INVOICE);
  const quotations = docs.filter((d) => d.type === DOCUMENT_TYPES.QUOTATION);

  const paidInvoices = invoices.filter((d) => d.status === 'Paid');
  const openInvoices = invoices.filter((d) => ['Sent', 'Viewed', 'Partially Paid', 'Overdue'].includes(d.status));

  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + calculateDocumentTotals(inv).subtotal, 0);
  const totalUnpaid = openInvoices.reduce((sum, inv) => sum + calculateDocumentTotals(inv).balanceDue, 0);
  const totalVatCollected = paidInvoices.reduce((sum, inv) => sum + calculateDocumentTotals(inv).taxTotal, 0);

  const monthlyRevenue = monthBuckets(12);
  for (const inv of paidInvoices) {
    const invDate = new Date(inv.issueDate);
    const key = new Date(invDate.getFullYear(), invDate.getMonth(), 1).toLocaleString('default', {
      month: 'short',
      year: '2-digit',
    });
    const bucket = monthlyRevenue.find((m) => m.name === key);
    if (bucket) bucket.revenue += calculateDocumentTotals(inv).subtotal;
  }

  const sentQuotes = quotations.filter((q) => ['Sent', 'Viewed', 'Approved', 'Accepted'].includes(q.status)).length;
  const acceptedQuotes = quotations.filter((q) => [QUOTATION_STATUS.ACCEPTED].includes(q.status)).length;
  const quoteConversionRate = sentQuotes === 0 ? 0 : (acceptedQuotes / sentQuotes) * 100;

  return res.json({
    totalRevenue,
    totalUnpaid,
    totalVatCollected,
    monthlyRevenue,
    quoteConversionRate,
  });
}));

router.get('/aging', asyncRoute(async (req, res) => {
  const db = await readDb();
  const docs = db.documents.filter((d) => d.companyId === req.user.companyId && d.type === DOCUMENT_TYPES.INVOICE);

  const buckets = {
    current: 0,
    d1_30: 0,
    d31_60: 0,
    d61_90: 0,
    d90_plus: 0,
  };

  const today = new Date();
  const lines = [];

  for (const inv of docs) {
    const totals = calculateDocumentTotals(inv);
    if (totals.balanceDue <= 0) continue;

    const due = new Date(inv.dueDate);
    const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) buckets.current += totals.balanceDue;
    else if (diffDays <= 30) buckets.d1_30 += totals.balanceDue;
    else if (diffDays <= 60) buckets.d31_60 += totals.balanceDue;
    else if (diffDays <= 90) buckets.d61_90 += totals.balanceDue;
    else buckets.d90_plus += totals.balanceDue;

    lines.push({
      invoiceId: inv.id,
      docNumber: inv.docNumber,
      clientId: inv.clientId,
      dueDate: inv.dueDate,
      daysOverdue: Math.max(diffDays, 0),
      balanceDue: totals.balanceDue,
    });
  }

  return res.json({ buckets, lines });
}));

router.get('/tax', asyncRoute(async (req, res) => {
  const db = await readDb();
  const invoices = db.documents.filter((d) => d.companyId === req.user.companyId && d.type === DOCUMENT_TYPES.INVOICE);

  const summary = invoices.reduce((acc, inv) => {
    const totals = calculateDocumentTotals(inv);
    acc.taxable += totals.subtotal - totals.discountTotal;
    acc.tax += totals.taxTotal;
    acc.gross += totals.grandTotal;
    return acc;
  }, { taxable: 0, tax: 0, gross: 0 });

  return res.json({
    period: req.query.period || 'all',
    summary,
  });
}));

module.exports = router;
