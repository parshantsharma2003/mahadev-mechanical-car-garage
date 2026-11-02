/**
 * Server-side financial rounding and validation for Service Estimates.
 * Ensures strict INR precision (2 decimal places) and prevents client-side manipulation.
 */

export function roundCurrency(val) {
  return Math.round((Number(val) || 0) * 100) / 100;
}

export function calculateEstimateTotals(rawItems, discountAmount = 0, taxRate = 0) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('Estimate must contain at least one line item.');
  }

  const items = rawItems.map((item, idx) => {
    if (!item.itemName || !String(item.itemName).trim()) {
      throw new Error(`Item at position ${idx + 1} is missing a valid name.`);
    }

    const quantity = Number(item.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error(`Item "${item.itemName}" quantity must be greater than zero.`);
    }

    const unitPrice = Number(item.unitPrice);
    if (isNaN(unitPrice) || unitPrice < 0) {
      throw new Error(`Item "${item.itemName}" unit price cannot be negative.`);
    }

    const lineTotal = roundCurrency(quantity * unitPrice);

    const validTypes = ['LABOUR', 'SERVICE', 'PART', 'OTHER'];
    const itemType = validTypes.includes(item.itemType) ? item.itemType : 'SERVICE';

    return {
      serviceId: item.serviceId || null,
      itemName: String(item.itemName).trim(),
      description: item.description ? String(item.description).trim() : '',
      quantity,
      unit: item.unit ? String(item.unit).trim() : 'job',
      unitPrice,
      lineTotal,
      itemType,
      status: item.status || 'PENDING'
    };
  });

  const subtotal = roundCurrency(items.reduce((sum, item) => sum + item.lineTotal, 0));

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
