import { describe, it, expect } from 'vitest';
import {
  calculateInvoiceTotals,
  calculatePurchaseTotals,
  calculateItemTotal,
  calculateItemWithDiscount,
  validateDiscount,
  validateInvoiceTotals,
  formatCurrency,
  buildHsnSummary,
} from '@/utils/calculations';

// ─── calculateInvoiceTotals ───────────────────────────────────────────────────

describe('calculateInvoiceTotals', () => {

  // THE MOST CRITICAL TEST — this was the bug that caused create vs edit mismatch
  it('create and edit produce the same total (the original bug)', () => {
    const items = [{ quantity: 2, sellingPrice: 500, gstRate: 18, cessRate: 0 }];
    const discount = 100;

    // Both create and edit now call the same function — result must be identical
    const result1 = calculateInvoiceTotals(items, discount, 'CGST_SGST', 0, null);
    const result2 = calculateInvoiceTotals(items, discount, 'CGST_SGST', 0, null);

    // ₹1000 - ₹100 discount = ₹900 subtotal, 18% GST = ₹162, total = ₹1062
    expect(result1.grandTotal).toBeCloseTo(1062, 0);
    expect(result2.grandTotal).toBe(result1.grandTotal);
  });

  it('₹1000 subtotal, ₹100 invoice discount, 18% GST = ₹1062', () => {
    const items = [{ quantity: 2, sellingPrice: 500, gstRate: 18, cessRate: 0 }];
    const result = calculateInvoiceTotals(items, 100, 'CGST_SGST', 0, null);

    expect(result.subtotal).toBe(1000);
    expect(result.totalDiscount).toBe(100);
    expect(result.totalTax).toBeCloseTo(162, 1);
    expect(result.grandTotal).toBeCloseTo(1062, 0);
  });

  it('zero discount → grandTotal = subtotal + tax', () => {
    const items = [{ quantity: 1, sellingPrice: 1000, gstRate: 18, cessRate: 0 }];
    const result = calculateInvoiceTotals(items, 0, 'CGST_SGST', 0, null);

    expect(result.grandTotal).toBeCloseTo(1180, 0);
  });

  it('full discount (100%) → grandTotal = 0', () => {
    const items = [{ quantity: 1, sellingPrice: 500, gstRate: 18, cessRate: 0 }];
    const result = calculateInvoiceTotals(items, 500, 'CGST_SGST', 0, null);

    expect(result.grandTotal).toBeCloseTo(0, 0);
  });

  it('multiple items with different GST rates', () => {
    const items = [
      { quantity: 1, sellingPrice: 1000, gstRate: 18, cessRate: 0 }, // ₹180 tax
      { quantity: 1, sellingPrice: 1000, gstRate: 5, cessRate: 0 },  // ₹50 tax
    ];
    const result = calculateInvoiceTotals(items, 0, 'CGST_SGST', 0, null);

    expect(result.subtotal).toBe(2000);
    expect(result.totalTax).toBeCloseTo(230, 1);
    expect(result.grandTotal).toBeCloseTo(2230, 0);
  });

  it('IGST produces same grand total as CGST_SGST', () => {
    const items = [{ quantity: 1, sellingPrice: 1000, gstRate: 18, cessRate: 0 }];
    const cgst = calculateInvoiceTotals(items, 0, 'CGST_SGST', 0, null);
    const igst = calculateInvoiceTotals(items, 0, 'IGST', 0, null);

    // Grand total is the same — only CGST/SGST vs IGST split differs
    expect(cgst.grandTotal).toBeCloseTo(igst.grandTotal, 2);
  });

  it('Composition Scheme → zero tax', () => {
    const items = [{ quantity: 1, sellingPrice: 1000, gstRate: 18, cessRate: 0 }];
    const shopSettings = { gstScheme: 'COMPOSITION' };
    const result = calculateInvoiceTotals(items, 0, 'CGST_SGST', 0, shopSettings);

    expect(result.totalTax).toBe(0);
    expect(result.grandTotal).toBe(1000);
  });

  it('item-level discount mode (discountAmount on item)', () => {
    // Item: ₹200, discount ₹50 → taxable ₹150, 12% GST = ₹18, total = ₹168
    const items = [{ quantity: 1, sellingPrice: 200, gstRate: 12, cessRate: 0, discountAmount: 50 }];
    const result = calculateInvoiceTotals(items, 0, 'CGST_SGST', 0, null);

    expect(result.hasItemDiscounts).toBe(true);
    expect(result.totalDiscount).toBe(50);
    expect(result.totalTax).toBeCloseTo(18, 1);
    expect(result.grandTotal).toBeCloseTo(168, 0);
  });

  it('empty items array returns all zeros', () => {
    const result = calculateInvoiceTotals([], 0, 'CGST_SGST', 0, null);
    expect(result.subtotal).toBe(0);
    expect(result.grandTotal).toBe(0);
    expect(result.totalTax).toBe(0);
  });

  it('finalTotal is rounded to nearest rupee', () => {
    // ₹101 × 18% = ₹18.18, total = ₹119.18 → finalTotal = ₹119
    const items = [{ quantity: 1, sellingPrice: 101, gstRate: 18, cessRate: 0 }];
    const result = calculateInvoiceTotals(items, 0, 'CGST_SGST', 0, null);

    expect(result.finalTotal).toBe(Math.round(result.grandTotal));
  });

  // ── Frontend ↔ Backend Consistency ───────────────────────────────────────────
  // This is the fix the user made: the invoice FORM preview and the stored invoice
  // (detail page + PDF) were showing different numbers because create and edit used
  // different calculation paths. Both now call calculateInvoiceTotals, which must
  // produce exactly the same grandTotal that the backend computes and stores.
  //
  // Backend formula (gstCalculations.js → calculateItemGST + calculateTotals):
  //   subtotalAfterDiscount = subtotal - discount
  //   discountRatio = subtotalAfterDiscount / subtotal
  //   totalTax = sum(item.totalTax * discountRatio)   ← proportional
  //   grandTotal = Math.round(subtotalAfterDiscount + totalTax)
  //
  // Frontend formula (calculateInvoiceTotals):
  //   itemAfterDiscount = itemTotal * discountRatio
  //   totalTax = sum(itemAfterDiscount * gstRate / 100)  ← same math
  //   finalTotal = Math.round(grandTotal)
  //
  // If these ever diverge, the form preview will show the wrong number.

  it('form preview finalTotal matches backend-stored grandTotal — no discount', () => {
    // Backend stores Math.round(1000 + 180) = 1180
    const result = calculateInvoiceTotals(
      [{ quantity: 1, sellingPrice: 1000, gstRate: 18, cessRate: 0 }],
      0, 'CGST_SGST', 0, null
    );
    expect(result.finalTotal).toBe(1180);
  });

  it('form preview finalTotal matches backend-stored grandTotal — invoice-level discount', () => {
    // Backend: subtotal=1000, discount=100, base=900, tax=900*18%=162, grandTotal=Math.round(1062)=1062
    const result = calculateInvoiceTotals(
      [{ quantity: 2, sellingPrice: 500, gstRate: 18, cessRate: 0 }],
      100, 'CGST_SGST', 0, null
    );
    expect(result.finalTotal).toBe(1062);
  });

  it('form preview finalTotal matches backend-stored grandTotal — item-level discount', () => {
    // Backend calculateItemGST: taxableAmount = 1000 - 100 = 900, tax = 162, totalAmount = 1062
    // calculateTotals: grandTotal = Math.round(900 + 162) = 1062
    const result = calculateInvoiceTotals(
      [{ quantity: 2, sellingPrice: 500, gstRate: 18, cessRate: 0, discountAmount: 100 }],
      0, 'CGST_SGST', 0, null
    );
    expect(result.finalTotal).toBe(1062);
  });
});

// ─── calculatePurchaseTotals ──────────────────────────────────────────────────

describe('calculatePurchaseTotals', () => {
  it('subtotal = items total, not subtotal - GST (the original bug)', () => {
    const items = [{ quantity: 2, purchasePrice: 300, gstRate: 18, cessRate: 0 }];
    const result = calculatePurchaseTotals(items, 0, 'CGST_SGST', 0, {}, null);

    // subtotal must be 600, NOT 600 - 108 = 492
    expect(result.subtotal).toBe(600);
    expect(result.totalTax).toBeCloseTo(108, 1);
    expect(result.grandTotal).toBeCloseTo(708, 0);
  });

  it('applies discount BEFORE calculating GST', () => {
    // ₹1000 - ₹100 discount = ₹900 taxable, 18% = ₹162, total = ₹1062
    const items = [{ quantity: 2, purchasePrice: 500, gstRate: 18, cessRate: 0 }];
    const result = calculatePurchaseTotals(items, 100, 'CGST_SGST', 0, {}, null);

    expect(result.totalTax).toBeCloseTo(162, 1);
    expect(result.grandTotal).toBeCloseTo(1062, 0);
  });

  it('adds freight and packaging to grand total', () => {
    const items = [{ quantity: 1, purchasePrice: 1000, gstRate: 18, cessRate: 0 }];
    const charges = { freightCharges: 100, packagingCharges: 50, otherCharges: 0 };
    const result = calculatePurchaseTotals(items, 0, 'CGST_SGST', 0, charges, null);

    expect(result.grandTotal).toBeCloseTo(1180 + 150, 0);
  });
});

// ─── validateDiscount ─────────────────────────────────────────────────────────

describe('validateDiscount', () => {
  it('valid discount returns isValid: true', () => {
    expect(validateDiscount(50, 100).isValid).toBe(true);
  });

  it('discount equal to subtotal is valid (zero invoice allowed)', () => {
    expect(validateDiscount(100, 100).isValid).toBe(true);
  });

  it('discount exceeding subtotal is invalid', () => {
    const result = validateDiscount(150, 100);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/cannot be greater/i);
  });

  it('negative discount is invalid', () => {
    const result = validateDiscount(-10, 100);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/negative/i);
  });
});

// ─── validateInvoiceTotals ────────────────────────────────────────────────────

describe('validateInvoiceTotals', () => {
  it('valid positive total passes', () => {
    expect(validateInvoiceTotals({ finalTotal: 1000 }).isValid).toBe(true);
  });

  it('zero total is allowed (returns warning, not error)', () => {
    const result = validateInvoiceTotals({ finalTotal: 0 });
    expect(result.isValid).toBe(true);
    expect(result.warning).toBeDefined();
  });

  it('negative total fails', () => {
    const result = validateInvoiceTotals({ finalTotal: -50 });
    expect(result.isValid).toBe(false);
  });
});

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats number with ₹ symbol', () => {
    expect(formatCurrency(1234.56)).toContain('₹');
    expect(formatCurrency(1234.56)).toContain('1,234.56');
  });

  it('without symbol flag returns just the number', () => {
    const result = formatCurrency(1234.56, false);
    expect(result).not.toContain('₹');
    expect(result).toContain('1,234.56');
  });
});

// ─── calculateItemTotal ───────────────────────────────────────────────────────

describe('calculateItemTotal', () => {
  it('2 × ₹500 @ 18% = ₹1180', () => {
    expect(calculateItemTotal(2, 500, 18, 0)).toBeCloseTo(1180, 0);
  });

  it('returns base amount when gstRate is 0', () => {
    expect(calculateItemTotal(3, 100, 0, 0)).toBe(300);
  });
});

// ─── calculateItemWithDiscount ────────────────────────────────────────────────

describe('calculateItemWithDiscount', () => {
  it('applies discount before GST', () => {
    const item = { quantity: 1, sellingPrice: 200, discountAmount: 50, gstRate: 12, cessRate: 0 };
    const result = calculateItemWithDiscount(item, null);

    expect(result.baseAmount).toBe(200);
    expect(result.discountAmount).toBe(50);
    expect(result.taxableAmount).toBe(150);
    expect(result.taxAmount).toBeCloseTo(18, 1);
    expect(result.itemTotal).toBeCloseTo(168, 0);
  });

  it('no discount → full base amount is taxable', () => {
    const item = { quantity: 1, sellingPrice: 1000, discountAmount: 0, gstRate: 18, cessRate: 0 };
    const result = calculateItemWithDiscount(item, null);

    expect(result.taxableAmount).toBe(1000);
    expect(result.taxAmount).toBeCloseTo(180, 1);
  });

  it('Composition scheme → zero tax', () => {
    const item = { quantity: 1, sellingPrice: 1000, discountAmount: 0, gstRate: 18, cessRate: 0 };
    const result = calculateItemWithDiscount(item, { gstScheme: 'COMPOSITION' });

    expect(result.taxAmount).toBe(0);
  });
});

// ─── buildHsnSummary ──────────────────────────────────────────────────────────
// This function is used by the PDF invoice templates (TallyPortraitTemplate,
// TallyLandscapeTemplate) to render the HSN/SAC tax summary table.
// It reads from stored invoice.items (taxableAmount and totalAmount come from
// the backend's calculateItemGST — so this is the function that ties the PDF
// output to the backend calculation). If it reads the wrong fields or calculates
// the wrong split, the PDF tax table shows different numbers than the invoice total.

describe('buildHsnSummary', () => {
  // Helper: simulate a DB-stored invoice item (fields set by backend calculateItemGST)
  const storedItem = ({ hsnCode = undefined, sacCode = undefined, gstRate, taxableAmount, totalAmount }) => ({
    hsnCode,
    sacCode,
    gstRate,
    taxableAmount,   // post-discount base — what GST was applied on
    totalAmount,     // taxableAmount + tax
    sellingPrice: 1000,
    quantity: 1,
    discountAmount: 0,
  });

  it('single item CGST_SGST — taxableValue, cgst, sgst are correct', () => {
    // ₹1000 taxable, 18% GST → tax = ₹180, totalAmount = ₹1180
    const items = [storedItem({ hsnCode: '1001', gstRate: 18, taxableAmount: 1000, totalAmount: 1180 })];
    const rows = buildHsnSummary(items, 'CGST_SGST');

    expect(rows).toHaveLength(1);
    const [key, data] = rows[0];
    expect(key).toBe('1001');
    expect(data.taxableValue).toBeCloseTo(1000, 2);
    expect(data.cgst).toBeCloseTo(90, 2);   // 180 / 2
    expect(data.sgst).toBeCloseTo(90, 2);
    expect(data.igst).toBe(0);
  });

  it('single item IGST — full tax goes into igst, cgst and sgst are zero', () => {
    const items = [storedItem({ hsnCode: '1001', gstRate: 18, taxableAmount: 1000, totalAmount: 1180 })];
    const rows = buildHsnSummary(items, 'IGST');

    const [, data] = rows[0];
    expect(data.igst).toBeCloseTo(180, 2);
    expect(data.cgst).toBe(0);
    expect(data.sgst).toBe(0);
  });

  it('two items with the same HSN code are merged into one row', () => {
    // Both items have HSN '1001' — should aggregate into a single entry
    const items = [
      storedItem({ hsnCode: '1001', gstRate: 18, taxableAmount: 1000, totalAmount: 1180 }), // tax=180
      storedItem({ hsnCode: '1001', gstRate: 18, taxableAmount: 500,  totalAmount: 590  }), // tax=90
    ];
    const rows = buildHsnSummary(items, 'CGST_SGST');

    expect(rows).toHaveLength(1);
    const [key, data] = rows[0];
    expect(key).toBe('1001');
    expect(data.taxableValue).toBeCloseTo(1500, 2);
    expect(data.cgst).toBeCloseTo(135, 2);  // (180+90) / 2
    expect(data.sgst).toBeCloseTo(135, 2);
  });

  it('two items with different HSN codes produce two separate rows', () => {
    const items = [
      storedItem({ hsnCode: '1001', gstRate: 18, taxableAmount: 1000, totalAmount: 1180 }),
      storedItem({ hsnCode: '2002', gstRate: 5,  taxableAmount: 1000, totalAmount: 1050 }),
    ];
    const rows = buildHsnSummary(items, 'CGST_SGST');

    expect(rows).toHaveLength(2);
    const keys = rows.map(([k]) => k);
    expect(keys).toContain('1001');
    expect(keys).toContain('2002');
  });

  it('item with sacCode (service) uses sacCode as the key', () => {
    // Services use sacCode, not hsnCode
    const items = [storedItem({ sacCode: '998311', gstRate: 18, taxableAmount: 1000, totalAmount: 1180 })];
    const rows = buildHsnSummary(items, 'CGST_SGST');

    expect(rows).toHaveLength(1);
    expect(rows[0][0]).toBe('998311');
  });

  it('item with no hsnCode and no sacCode falls back to N/A', () => {
    const items = [storedItem({ gstRate: 18, taxableAmount: 1000, totalAmount: 1180 })];
    const rows = buildHsnSummary(items, 'CGST_SGST');

    expect(rows[0][0]).toBe('N/A');
  });

  it('empty items array returns empty rows', () => {
    const rows = buildHsnSummary([], 'CGST_SGST');
    expect(rows).toHaveLength(0);
  });

  it('item without taxableAmount falls back to sellingPrice × quantity − discount', () => {
    // Simulates an older invoice item that did not have taxableAmount stored
    const item = {
      hsnCode: '1001',
      gstRate: 18,
      taxableAmount: undefined, // missing
      totalAmount: 1180,
      sellingPrice: 1000,
      quantity: 1,
      discountAmount: 0,
    };
    const rows = buildHsnSummary([item], 'CGST_SGST');

    // Fallback: sellingPrice(1000) * quantity(1) - discount(0) = 1000
    const [, data] = rows[0];
    expect(data.taxableValue).toBeCloseTo(1000, 2);
    expect(data.cgst).toBeCloseTo(90, 2);
  });
});
