/**
 * Server-side financial calculation and validation utility for Suppliers & Purchases.
 * Enforces strict 2-decimal INR currency precision and validates line items.
 */

export function roundCurrency(val) {
  return Math.round((Number(val) || 0) * 100) / 100;
}

export function calculatePurchaseTotals(rawItems, discountAmount = 0, taxAmount = 0) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    const err = new Error('Purchase must contain at least one line item.');
    err.code = 'ITEMS_REQUIRED';
    throw err;
  }

  const items = rawItems.map((item, idx) => {
    const name = item.itemName || item.name || item.title;
    if (!name || !String(name).trim()) {
      const err = new Error(`Item at row ${idx + 1} is missing a valid item name.`);
      err.code = 'INVALID_PURCHASE_ITEM';
      throw err;
    }

    const quantity = Number(item.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      const err = new Error(`Item "${name}" quantity must be greater than zero.`);
      err.code = 'INVALID_PURCHASE_ITEM';
      throw err;
    }

    const unitPrice = Number(item.unitPrice);
    if (isNaN(unitPrice) || unitPrice < 0) {
      const err = new Error(`Item "${name}" unit price cannot be negative.`);
      err.code = 'INVALID_PURCHASE_ITEM';
      throw err;
    }

    const lineTotal = roundCurrency(quantity * unitPrice);

    return {
      itemName: String(name).trim(),
      description: item.description ? String(item.description).trim() : '',
      quantity,
      unit: item.unit ? String(item.unit).trim().toLowerCase() : 'pcs',
      unitPrice,
      lineTotal,
      category: item.category ? String(item.category).trim() : 'GENERAL'
    };
  });

  const subtotal = roundCurrency(items.reduce((sum, it) => sum + it.lineTotal, 0));

  const parsedDiscount = Number(discountAmount) || 0;
  if (parsedDiscount < 0) {
    const err = new Error('Discount amount cannot be negative.');
    err.code = 'INVALID_DISCOUNT';
    throw err;
  }
  if (parsedDiscount > subtotal) {
    const err = new Error(`Discount amount (₹${parsedDiscount}) cannot exceed subtotal (₹${subtotal}).`);
    err.code = 'INVALID_DISCOUNT';
    throw err;
  }
  const discount = roundCurrency(parsedDiscount);

  const parsedTax = Number(taxAmount) || 0;
  if (parsedTax < 0) {
    const err = new Error('Tax amount cannot be negative.');
    err.code = 'INVALID_TAX';
    throw err;
  }
  const tax = roundCurrency(parsedTax);

  const grandTotal = roundCurrency(Math.max(0, subtotal - discount) + tax);

  return {
    items,
    subtotal,
    discountAmount: discount,
    taxAmount: tax,
    grandTotal
  };
}
