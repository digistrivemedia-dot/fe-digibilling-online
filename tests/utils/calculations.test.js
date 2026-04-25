import { describe, it, expect } from 'vitest';
import {
  calculateInvoiceTotals,
  calculatePurchaseTotals,
  calculateItemTotal,
  calculateItemWithDiscount,
  validateDiscount,
  validateInvoiceTotals,
  formatCurrency,
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
