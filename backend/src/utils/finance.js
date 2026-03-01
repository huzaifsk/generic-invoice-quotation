function normalizeLineItems(items = []) {
  return items.map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    taxPercent: Number(item.taxPercent || 0),
    discountPercent: Number(item.discountPercent || 0),
  }));
}

function lineAmount(item) {
  const gross = Number(item.quantity) * Number(item.unitPrice);
  const discount = gross * (Number(item.discountPercent || 0) / 100);
  const taxable = gross - discount;
  const tax = taxable * (Number(item.taxPercent || 0) / 100);
  return {
    gross,
    discount,
    taxable,
    tax,
    total: taxable + tax,
  };
}

function calculateDocumentTotals(document) {
  const items = normalizeLineItems(document.items || []);
  const totals = items.reduce((acc, item) => {
    const row = lineAmount(item);
    acc.subtotal += row.gross;
    acc.discountTotal += row.discount;
    acc.taxTotal += row.tax;
    acc.grandTotal += row.total;
    return acc;
  }, {
    subtotal: 0,
    discountTotal: 0,
    taxTotal: 0,
    grandTotal: 0,
  });

  return {
    ...totals,
    balanceDue: Math.max(0, totals.grandTotal - Number(document.paidAmount || 0) - Number(document.creditApplied || 0)),
  };
}

module.exports = {
  calculateDocumentTotals,
  normalizeLineItems,
};
