function nextSequence(db, companyId, scope) {
  const key = `${companyId}:${scope}`;
  const current = Number(db.sequences[key] || 0) + 1;
  db.sequences[key] = current;
  return current;
}

function nextDocumentNumber(db, companyId, type) {
  const scope = type === 'invoice' ? 'invoiceNumber' : 'quotationNumber';
  const seq = nextSequence(db, companyId, scope);
  const prefix = type === 'invoice' ? 'INV' : 'QUO';
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

function nextCreditNoteNumber(db, companyId) {
  const seq = nextSequence(db, companyId, 'creditNoteNumber');
  return `CRN-${String(seq).padStart(6, '0')}`;
}

function nextPaymentReceiptNumber(db, companyId) {
  const seq = nextSequence(db, companyId, 'paymentReceiptNumber');
  return `RCT-${String(seq).padStart(6, '0')}`;
}

module.exports = {
  nextDocumentNumber,
  nextCreditNoteNumber,
  nextPaymentReceiptNumber,
};
