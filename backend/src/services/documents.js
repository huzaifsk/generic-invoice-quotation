const { calculateDocumentTotals, normalizeLineItems } = require('../utils/finance');
const { DOCUMENT_TYPES, INVOICE_STATUS, QUOTATION_STATUS, QUOTATION_TRANSITIONS, INVOICE_TRANSITIONS } = require('../constants/workflow');

function canTransition(type, currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return true;
  const transitions = type === DOCUMENT_TYPES.QUOTATION ? QUOTATION_TRANSITIONS : INVOICE_TRANSITIONS;
  const allowed = transitions[currentStatus] || [];
  return allowed.includes(nextStatus);
}

function validateLineItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'At least one line item is required.';
  }

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i] || {};
    if (!String(item.description || '').trim()) {
      return `Line ${i + 1}: description is required.`;
    }

    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const taxPercent = Number(item.taxPercent || 0);
    const discountPercent = Number(item.discountPercent || 0);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return `Line ${i + 1}: quantity must be > 0.`;
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return `Line ${i + 1}: unitPrice must be >= 0.`;
    }

    if (taxPercent < 0 || taxPercent > 100) {
      return `Line ${i + 1}: taxPercent must be between 0 and 100.`;
    }

    if (discountPercent < 0 || discountPercent > 100) {
      return `Line ${i + 1}: discountPercent must be between 0 and 100.`;
    }
  }

  return null;
}

function enrichDocumentFinancials(document) {
  const normalizedItems = normalizeLineItems(document.items || []);
  const totals = calculateDocumentTotals({ ...document, items: normalizedItems });
  return {
    ...document,
    items: normalizedItems,
    totals,
  };
}

function computeInvoiceStatusFromBalance(invoice) {
  const totals = calculateDocumentTotals(invoice);

  if (invoice.status === INVOICE_STATUS.CANCELLED) return INVOICE_STATUS.CANCELLED;
  if (totals.balanceDue <= 0 && totals.grandTotal > 0) return INVOICE_STATUS.PAID;

  const paidAmount = Number(invoice.paidAmount || 0);
  if (paidAmount > 0 && totals.balanceDue > 0) return INVOICE_STATUS.PARTIALLY_PAID;

  const now = new Date();
  const dueDate = new Date(invoice.dueDate);
  if (Number.isFinite(dueDate.getTime()) && dueDate < now && [INVOICE_STATUS.SENT, INVOICE_STATUS.VIEWED].includes(invoice.status)) {
    return INVOICE_STATUS.OVERDUE;
  }

  return invoice.status || INVOICE_STATUS.DRAFT;
}

function normalizeDocumentDefaults(doc, company) {
  const defaults = {
    paymentTerms: `${company?.paymentTermsDays || 30} days`,
    currency: company?.currency || 'AED',
  };

  return {
    ...doc,
    paymentTerms: String(doc.paymentTerms || defaults.paymentTerms),
    currency: String(doc.currency || defaults.currency),
    paidAmount: Number(doc.paidAmount || 0),
    creditApplied: Number(doc.creditApplied || 0),
    attachments: Array.isArray(doc.attachments) ? doc.attachments : [],
    notes: String(doc.notes || ''),
    revision: Number(doc.revision || 1),
    conversion: doc.conversion && typeof doc.conversion === 'object' ? doc.conversion : { convertedItems: {} },
  };
}

function isInvoiceEditLocked(invoice) {
  const status = invoice.status;
  const immutableStatuses = [INVOICE_STATUS.PAID, INVOICE_STATUS.CANCELLED];
  return Number(invoice.paidAmount || 0) > 0 || immutableStatuses.includes(status);
}

module.exports = {
  canTransition,
  validateLineItems,
  enrichDocumentFinancials,
  computeInvoiceStatusFromBalance,
  normalizeDocumentDefaults,
  isInvoiceEditLocked,
  DOCUMENT_TYPES,
  INVOICE_STATUS,
  QUOTATION_STATUS,
};
