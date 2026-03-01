const express = require('express');
const { nanoid } = require('nanoid');
const { readDb, mutateDb } = require('../db/store');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { nextDocumentNumber } = require('../utils/sequence');
const { logActivity } = require('../utils/activity');
const { sanitizeString, isISODate } = require('../utils/validation');
const { asyncRoute } = require('../utils/async-route');
const {
  canTransition,
  validateLineItems,
  enrichDocumentFinancials,
  computeInvoiceStatusFromBalance,
  normalizeDocumentDefaults,
  isInvoiceEditLocked,
  DOCUMENT_TYPES,
  INVOICE_STATUS,
  QUOTATION_STATUS,
} = require('../services/documents');

const router = express.Router();
router.use(requireAuth);

function getDocument(db, companyId, id) {
  return db.documents.find((d) => d.companyId === companyId && d.id === id);
}

router.get('/', requirePermission('documents:read'), asyncRoute(async (req, res) => {
  const db = await readDb();
  const { type, status, clientId } = req.query;

  let docs = db.documents.filter((d) => d.companyId === req.user.companyId);
  if (type) docs = docs.filter((d) => d.type === type);
  if (status) docs = docs.filter((d) => d.status === status);
  if (clientId) docs = docs.filter((d) => d.clientId === clientId);

  res.json(docs.map((doc) => enrichDocumentFinancials(doc)));
}));

router.get('/:id', requirePermission('documents:read'), asyncRoute(async (req, res) => {
  const db = await readDb();
  const doc = getDocument(db, req.user.companyId, req.params.id);
  if (!doc) return res.status(404).json({ message: 'Document not found.' });
  return res.json(enrichDocumentFinancials(doc));
}));

router.post('/', requirePermission('documents:write'), asyncRoute(async (req, res) => {
  const payload = req.body || {};
  const { type, clientId, issueDate, dueDate, items } = payload;

  if (![DOCUMENT_TYPES.QUOTATION, DOCUMENT_TYPES.INVOICE].includes(type)) {
    return res.status(400).json({ message: 'Invalid document type.' });
  }

  if (!clientId || !isISODate(issueDate) || !isISODate(dueDate)) {
    return res.status(400).json({ message: 'clientId, issueDate, and dueDate are required.' });
  }

  const itemError = validateLineItems(items);
  if (itemError) return res.status(400).json({ message: itemError });

  const created = await mutateDb(async (db) => {
    const company = db.companies.find((c) => c.id === req.user.companyId);
    const number = nextDocumentNumber(db, req.user.companyId, type);

    const baseStatus = type === DOCUMENT_TYPES.QUOTATION ? QUOTATION_STATUS.DRAFT : INVOICE_STATUS.DRAFT;
    const document = normalizeDocumentDefaults({
      id: `doc_${nanoid(12)}`,
      companyId: req.user.companyId,
      docNumber: number,
      type,
      clientId,
      issueDate,
      dueDate,
      validityDate: payload.validityDate && isISODate(payload.validityDate) ? payload.validityDate : null,
      items: items.map((item) => ({ ...item, id: item.id || `item_${nanoid(10)}` })),
      terms: sanitizeString(payload.terms),
      notes: sanitizeString(payload.notes),
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      status: baseStatus,
      paymentTerms: payload.paymentTerms,
      currency: payload.currency,
      createdBy: req.user.id,
      approvedBy: null,
      approvedAt: null,
      paidAmount: 0,
      creditApplied: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revision: 1,
      conversion: { convertedItems: {} },
    }, company);

    db.documents.push(document);

    if (type === DOCUMENT_TYPES.QUOTATION) {
      db.quoteVersions.push({
        id: `qv_${nanoid(12)}`,
        companyId: req.user.companyId,
        documentId: document.id,
        revision: 1,
        snapshot: document,
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
      });
    }

    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: `${type}.create`,
      entityType: type,
      entityId: document.id,
      metadata: { docNumber: document.docNumber },
    });

    return document;
  });

  return res.status(201).json(enrichDocumentFinancials(created));
}));

router.put('/:id', requirePermission('documents:write'), asyncRoute(async (req, res) => {
  const payload = req.body || {};

  const updated = await mutateDb(async (db) => {
    const doc = getDocument(db, req.user.companyId, req.params.id);
    if (!doc) return null;

    if (doc.type === DOCUMENT_TYPES.INVOICE && isInvoiceEditLocked(doc)) {
      throw Object.assign(new Error('Invoice is locked after payment/cancellation.'), { statusCode: 409 });
    }

    if (payload.issueDate !== undefined && !isISODate(payload.issueDate)) {
      throw Object.assign(new Error('Invalid issueDate.'), { statusCode: 400 });
    }
    if (payload.dueDate !== undefined && !isISODate(payload.dueDate)) {
      throw Object.assign(new Error('Invalid dueDate.'), { statusCode: 400 });
    }
    if (payload.validityDate !== undefined && payload.validityDate !== null && !isISODate(payload.validityDate)) {
      throw Object.assign(new Error('Invalid validityDate.'), { statusCode: 400 });
    }

    if (payload.items !== undefined) {
      const itemError = validateLineItems(payload.items);
      if (itemError) throw Object.assign(new Error(itemError), { statusCode: 400 });
      doc.items = payload.items.map((item) => ({ ...item, id: item.id || `item_${nanoid(10)}` }));
    }

    const mutableKeys = ['clientId', 'issueDate', 'dueDate', 'validityDate', 'terms', 'notes', 'paymentTerms', 'currency', 'attachments'];
    for (const key of mutableKeys) {
      if (payload[key] !== undefined) {
        doc[key] = payload[key];
      }
    }

    doc.updatedAt = new Date().toISOString();

    if (doc.type === DOCUMENT_TYPES.QUOTATION && payload.createRevision === true) {
      doc.revision = Number(doc.revision || 1) + 1;
      db.quoteVersions.push({
        id: `qv_${nanoid(12)}`,
        companyId: req.user.companyId,
        documentId: doc.id,
        revision: doc.revision,
        snapshot: { ...doc },
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
      });
    }

    if (doc.type === DOCUMENT_TYPES.INVOICE) {
      doc.status = computeInvoiceStatusFromBalance(doc);
    }

    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: `${doc.type}.update`,
      entityType: doc.type,
      entityId: doc.id,
      metadata: { revision: doc.revision },
    });

    return doc;
  });

  if (!updated) {
    return res.status(404).json({ message: 'Document not found.' });
  }

  return res.json(enrichDocumentFinancials(updated));
}));

router.patch('/:id/status', requirePermission('documents:status'), asyncRoute(async (req, res) => {
  const { status, force } = req.body || {};
  if (!status) return res.status(400).json({ message: 'status is required.' });

  const updated = await mutateDb(async (db) => {
    const doc = getDocument(db, req.user.companyId, req.params.id);
    if (!doc) return null;

    const allowedStatuses = doc.type === DOCUMENT_TYPES.INVOICE
      ? Object.values(INVOICE_STATUS)
      : Object.values(QUOTATION_STATUS);

    if (!allowedStatuses.includes(status)) {
      throw Object.assign(new Error(`Invalid status "${status}" for ${doc.type}.`), { statusCode: 400 });
    }

    // Keep paid/cancelled invoices immutable unless status is unchanged.
    if (doc.type === DOCUMENT_TYPES.INVOICE && isInvoiceEditLocked(doc) && doc.status !== status) {
      throw Object.assign(new Error('Invoice status is locked after payment/cancellation.'), { statusCode: 409 });
    }

    if (!canTransition(doc.type, doc.status, status) && !force) {
      throw Object.assign(
        new Error(`Invalid transition from ${doc.status} to ${status}. Set "force": true for manual override.`),
        { statusCode: 409 }
      );
    }

    doc.status = status;
    doc.updatedAt = new Date().toISOString();

    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: `${doc.type}.status`,
      entityType: doc.type,
      entityId: doc.id,
      metadata: { status, force: Boolean(force) },
    });

    return doc;
  });

  if (!updated) return res.status(404).json({ message: 'Document not found.' });
  return res.json(enrichDocumentFinancials(updated));
}));

router.post('/:id/request-approval', requirePermission('documents:write'), asyncRoute(async (req, res) => {
  const updated = await mutateDb(async (db) => {
    const doc = getDocument(db, req.user.companyId, req.params.id);
    if (!doc || doc.type !== DOCUMENT_TYPES.QUOTATION) return null;

    const company = db.companies.find((c) => c.id === req.user.companyId);
    const totals = enrichDocumentFinancials(doc).totals;
    if (totals.grandTotal < Number(company?.approvalThreshold || 0)) {
      throw Object.assign(new Error('Approval workflow is not required for this amount.'), { statusCode: 400 });
    }

    if (!canTransition(DOCUMENT_TYPES.QUOTATION, doc.status, QUOTATION_STATUS.APPROVAL_PENDING)) {
      throw Object.assign(new Error('Cannot request approval from the current status.'), { statusCode: 409 });
    }

    doc.status = QUOTATION_STATUS.APPROVAL_PENDING;
    doc.updatedAt = new Date().toISOString();

    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'quotation.approval.requested',
      entityType: 'quotation',
      entityId: doc.id,
      metadata: {},
    });

    return doc;
  });

  if (!updated) return res.status(404).json({ message: 'Quotation not found.' });
  return res.json(enrichDocumentFinancials(updated));
}));

router.post('/:id/approve', requirePermission('documents:approve'), asyncRoute(async (req, res) => {
  const updated = await mutateDb(async (db) => {
    const doc = getDocument(db, req.user.companyId, req.params.id);
    if (!doc || doc.type !== DOCUMENT_TYPES.QUOTATION) return null;

    if (!canTransition(doc.type, doc.status, QUOTATION_STATUS.APPROVED)) {
      throw Object.assign(new Error('Quotation cannot be approved from current status.'), { statusCode: 409 });
    }

    doc.status = QUOTATION_STATUS.APPROVED;
    doc.approvedBy = req.user.id;
    doc.approvedAt = new Date().toISOString();
    doc.updatedAt = doc.approvedAt;

    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'quotation.approved',
      entityType: 'quotation',
      entityId: doc.id,
      metadata: {},
    });

    return doc;
  });

  if (!updated) return res.status(404).json({ message: 'Quotation not found.' });
  return res.json(enrichDocumentFinancials(updated));
}));

router.get('/:id/versions', requirePermission('documents:read'), asyncRoute(async (req, res) => {
  const db = await readDb();
  const doc = getDocument(db, req.user.companyId, req.params.id);
  if (!doc || doc.type !== DOCUMENT_TYPES.QUOTATION) {
    return res.status(404).json({ message: 'Quotation not found.' });
  }

  const versions = db.quoteVersions
    .filter((v) => v.companyId === req.user.companyId && v.documentId === req.params.id)
    .sort((a, b) => b.revision - a.revision);

  return res.json(versions);
}));

router.post('/:id/versions', requirePermission('documents:write'), asyncRoute(async (req, res) => {
  const { changes } = req.body || {};
  const updated = await mutateDb(async (db) => {
    const doc = getDocument(db, req.user.companyId, req.params.id);
    if (!doc || doc.type !== DOCUMENT_TYPES.QUOTATION) return null;

    if (changes && typeof changes === 'object') {
      Object.assign(doc, changes);
    }

    if (changes?.items) {
      const itemError = validateLineItems(changes.items);
      if (itemError) throw Object.assign(new Error(itemError), { statusCode: 400 });
    }

    doc.revision = Number(doc.revision || 1) + 1;
    doc.updatedAt = new Date().toISOString();

    db.quoteVersions.push({
      id: `qv_${nanoid(12)}`,
      companyId: req.user.companyId,
      documentId: doc.id,
      revision: doc.revision,
      snapshot: { ...doc },
      createdBy: req.user.id,
      createdAt: doc.updatedAt,
    });

    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'quotation.version.created',
      entityType: 'quotation',
      entityId: doc.id,
      metadata: { revision: doc.revision },
    });

    return doc;
  });

  if (!updated) return res.status(404).json({ message: 'Quotation not found.' });
  return res.json(enrichDocumentFinancials(updated));
}));

router.post('/:id/convert', requirePermission('documents:convert'), asyncRoute(async (req, res) => {
  const { items: requestedItems, callbackPath } = req.body || {};

  const result = await mutateDb(async (db) => {
    const quote = getDocument(db, req.user.companyId, req.params.id);
    if (!quote || quote.type !== DOCUMENT_TYPES.QUOTATION) {
      return { error: 'Quotation not found.' };
    }

    const convertibleStatuses = [QUOTATION_STATUS.APPROVED, QUOTATION_STATUS.ACCEPTED];
    if (!convertibleStatuses.includes(quote.status)) {
      return { error: 'Only approved quotations can be converted to invoices.' };
    }

    if (callbackPath != null && (typeof callbackPath !== 'string' || !callbackPath.startsWith('/'))) {
      return { error: 'callbackPath must be a relative path starting with /.' };
    }

    const selection = Array.isArray(requestedItems) && requestedItems.length > 0
      ? requestedItems
      : quote.items.map((item) => ({ lineItemId: item.id, quantity: item.quantity }));

    const convertedMap = { ...(quote.conversion?.convertedItems || {}) };
    const invoiceItems = [];
    const fullyConvertedBefore = quote.items.every((item) => Number(convertedMap[item.id] || 0) >= Number(item.quantity));
    if (fullyConvertedBefore) {
      return { error: 'This quotation has already been fully converted to invoices.' };
    }

    for (const selected of selection) {
      const source = quote.items.find((item) => item.id === selected.lineItemId);
      if (!source) {
        return { error: `Line item ${selected.lineItemId} not found.` };
      }

      const alreadyConverted = Number(convertedMap[source.id] || 0);
      const remaining = Number(source.quantity) - alreadyConverted;
      const quantityToConvert = Number(selected.quantity || 0);

      if (quantityToConvert <= 0 || quantityToConvert > remaining) {
        return { error: `Invalid conversion quantity for line ${source.id}.` };
      }

      convertedMap[source.id] = alreadyConverted + quantityToConvert;
      invoiceItems.push({
        ...source,
        id: `item_${nanoid(10)}`,
        quantity: quantityToConvert,
      });
    }

    const invoice = normalizeDocumentDefaults({
      id: `doc_${nanoid(12)}`,
      companyId: req.user.companyId,
      docNumber: nextDocumentNumber(db, req.user.companyId, DOCUMENT_TYPES.INVOICE),
      type: DOCUMENT_TYPES.INVOICE,
      clientId: quote.clientId,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: quote.dueDate,
      items: invoiceItems,
      terms: quote.terms,
      notes: `Converted from quotation ${quote.docNumber}`,
      status: INVOICE_STATUS.DRAFT,
      createdBy: req.user.id,
      paidAmount: 0,
      creditApplied: 0,
      attachments: quote.attachments || [],
      paymentTerms: quote.paymentTerms,
      currency: quote.currency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, db.companies.find((c) => c.id === req.user.companyId));

    quote.conversion = {
      convertedItems: convertedMap,
      lastInvoiceId: invoice.id,
      convertedAt: new Date().toISOString(),
    };
    quote.updatedAt = new Date().toISOString();

    db.documents.push(invoice);

    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: 'quotation.converted',
      entityType: 'quotation',
      entityId: quote.id,
      metadata: { invoiceId: invoice.id },
    });

    return {
      invoice,
      quote,
      callback: {
        action: 'open_invoice_editor',
        nextPath: callbackPath || '/editor',
        invoiceId: invoice.id,
      },
    };
  });

  if (result.error) {
    return res.status(400).json({ message: result.error });
  }

  return res.status(201).json({
    invoice: enrichDocumentFinancials(result.invoice),
    quotation: enrichDocumentFinancials(result.quote),
    callback: result.callback,
  });
}));

router.delete('/:id', requirePermission('documents:write'), asyncRoute(async (req, res) => {
  const deleted = await mutateDb(async (db) => {
    const index = db.documents.findIndex((d) => d.id === req.params.id && d.companyId === req.user.companyId);
    if (index === -1) return false;

    const doc = db.documents[index];
    if (doc.type === DOCUMENT_TYPES.INVOICE && Number(doc.paidAmount || 0) > 0) {
      throw Object.assign(new Error('Paid invoice cannot be deleted.'), { statusCode: 409 });
    }

    db.documents.splice(index, 1);
    logActivity(db, {
      companyId: req.user.companyId,
      userId: req.user.id,
      action: `${doc.type}.delete`,
      entityType: doc.type,
      entityId: doc.id,
      metadata: {},
    });

    return true;
  });

  if (!deleted) return res.status(404).json({ message: 'Document not found.' });
  return res.status(204).send();
}));

module.exports = router;
