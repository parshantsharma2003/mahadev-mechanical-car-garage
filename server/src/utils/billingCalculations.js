/**
 * Server-side financial rounding and calculation utility for Billing & Invoicing.
 * Enforces strict 2-decimal INR currency precision and validates invoice line items.
 */

export function roundCurrency(val) {
  return Math.round((Number(val) || 0) * 100) / 100;
}

export function calculateInvoiceTotals(rawItems, discountAmount = 0, taxRate = 0) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    const err = new Error('Invoice must contain at least one line item.');
    err.code = 'ITEMS_REQUIRED';
    throw err;
  }

  const items = rawItems.map((item, idx) => {
    const name = item.itemName || item.name || item.description;
    if (!name || !String(name).trim()) {
      const err = new Error(`Item at line ${idx + 1} is missing a valid item name.`);
      err.code = 'INVALID_LINE_ITEM';
      throw err;
    }

    const quantity = Number(item.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      const err = new Error(`Item "${name}" quantity must be greater than zero.`);
      err.code = 'INVALID_LINE_ITEM';
      throw err;
    }

    const unitPrice = Number(item.unitPrice);
    if (isNaN(unitPrice) || unitPrice < 0) {
      const err = new Error(`Item "${name}" unit price cannot be negative.`);
      err.code = 'INVALID_LINE_ITEM';
      throw err;
    }

    const lineTotal = roundCurrency(quantity * unitPrice);
    const validTypes = ['SERVICE', 'LABOUR', 'PART', 'OTHER'];
    const itemType = validTypes.includes(item.itemType) ? item.itemType : 'SERVICE';

    return {
      itemName: String(name).trim(),
      description: item.description ? String(item.description).trim() : String(name).trim(),
      itemType,
      quantity,
      unit: item.unit ? String(item.unit).trim() : 'job',
      unitPrice,
      lineTotal,
      sourceEstimateItemId: item.sourceEstimateItemId || null
    };
  });

  const subtotal = roundCurrency(items.reduce((sum, it) => sum + it.lineTotal, 0));

  const parsedDiscount = Number(discountAmount) || 0;
  if (parsedDiscount < 0) {
    throw new Error('Discount amount cannot be negative.');
  }
  if (parsedDiscount > subtotal) {
    throw new Error(`Discount amount (₹${parsedDiscount}) cannot exceed subtotal (₹${subtotal}).`);
  }
  const discount = roundCurrency(parsedDiscount);

  const parsedTaxRate = Number(taxRate) || 0;
  if (parsedTaxRate < 0 || parsedTaxRate > 100) {
    throw new Error('Tax rate must be between 0% and 100%.');
  }

  const taxableAmount = Math.max(0, subtotal - discount);
  const taxAmount = roundCurrency(taxableAmount * (parsedTaxRate / 100));
  const grandTotal = roundCurrency(taxableAmount + taxAmount);

  return {
    items,
    subtotal,
    discountAmount: discount,
    taxRate: parsedTaxRate,
    taxAmount,
    grandTotal
  };
}
