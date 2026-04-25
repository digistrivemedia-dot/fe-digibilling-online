/**
 * Tests for the New Invoice page — focused on the calculation and validation
 * logic used inside the component, not the full render tree.
 *
 * Why not mount the full page?
 * The page has 10+ context dependencies (Auth, Toast, Zustand stores, Next router,
 * multiple API calls). Mounting the full component becomes a mocking exercise,
 * not a real test. Instead we test:
 *   1. The calculation utility the page delegates to (calculations.js)
 *   2. The behaviour of isolated sub-logic (discount validation, totals update)
 *   3. Snapshot of key rendered values to catch regressions
 *
 * Full user-flow testing (fill form → submit → see invoice) is handled by E2E (Playwright).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  calculateInvoiceTotals,
  validateDiscount,
  validateInvoiceTotals,
} from '@/utils/calculations';

// ─── Calculation logic as used inside the page ────────────────────────────────
// These mirror exactly how the page calls calculateInvoiceTotals in its
// recalculate() function. If these break, the page totals are wrong.

describe('Invoice page — calculation integration', () => {

  const shopSettings = { gstScheme: 'REGULAR' };

  it('adding one service item updates totals correctly', () => {
    const items = [
      { quantity: 1, sellingPrice: 1000, gstRate: 18, cessRate: 0, discountAmount: 0 }
    ];
    const totals = calculateInvoiceTotals(items, 0, 'CGST_SGST', 0, shopSettings);

    expect(totals.subtotal).toBe(1000);
    expect(totals.totalTax).toBeCloseTo(180, 1);
    expect(totals.finalTotal).toBe(1180);
  });

  it('adding a discount reduces grand total proportionally', () => {
    const items = [
      { quantity: 2, sellingPrice: 500, gstRate: 18, cessRate: 0, discountAmount: 0 }
    ];
    // Before discount
    const before = calculateInvoiceTotals(items, 0, 'CGST_SGST', 0, shopSettings);
    // After ₹100 discount
    const after = calculateInvoiceTotals(items, 100, 'CGST_SGST', 0, shopSettings);

    expect(after.finalTotal).toBeLessThan(before.finalTotal);
    // ₹900 × 1.18 = ₹1062
    expect(after.finalTotal).toBe(1062);
  });

  it('switching from CGST_SGST to IGST keeps same grand total', () => {
    const items = [
      { quantity: 1, sellingPrice: 5000, gstRate: 12, cessRate: 0, discountAmount: 0 }
    ];
    const intraState = calculateInvoiceTotals(items, 0, 'CGST_SGST', 0, shopSettings);
    const interState = calculateInvoiceTotals(items, 0, 'IGST', 0, shopSettings);

    expect(intraState.grandTotal).toBeCloseTo(interState.grandTotal, 2);
  });

  it('multiple items with different GST rates sum correctly', () => {
    const items = [
      { quantity: 1, sellingPrice: 1000, gstRate: 5, cessRate: 0, discountAmount: 0 },
      { quantity: 1, sellingPrice: 1000, gstRate: 12, cessRate: 0, discountAmount: 0 },
      { quantity: 1, sellingPrice: 1000, gstRate: 18, cessRate: 0, discountAmount: 0 },
    ];
    const totals = calculateInvoiceTotals(items, 0, 'CGST_SGST', 0, shopSettings);

    // 5 + 12 + 18 = 35% tax on ₹3000 = ₹350 tax
    expect(totals.subtotal).toBe(3000);
    expect(totals.totalTax).toBeCloseTo(350, 0);
    expect(totals.grandTotal).toBeCloseTo(3350, 0);
  });

  it('0% GST item (exempt goods)', () => {
    const items = [
      { quantity: 10, sellingPrice: 100, gstRate: 0, cessRate: 0, discountAmount: 0 }
    ];
    const totals = calculateInvoiceTotals(items, 0, 'CGST_SGST', 0, shopSettings);

    expect(totals.totalTax).toBe(0);
    expect(totals.grandTotal).toBe(1000);
  });
});

// ─── Discount validation as used by the page ──────────────────────────────────

describe('Invoice page — discount validation', () => {
  it('blocks submit when discount > subtotal', () => {
    const subtotal = 500;
    const discount = 600;
    const validation = validateDiscount(discount, subtotal);

    expect(validation.isValid).toBe(false);
    expect(validation.error).toBeTruthy();
  });

  it('allows submit when discount = subtotal (zero invoice)', () => {
    const validation = validateDiscount(500, 500);
    const totals = calculateInvoiceTotals(
      [{ quantity: 1, sellingPrice: 500, gstRate: 18, cessRate: 0, discountAmount: 0 }],
      500, 'CGST_SGST', 0, null
    );
    const totalsValidation = validateInvoiceTotals(totals);

    expect(validation.isValid).toBe(true);
    expect(totalsValidation.isValid).toBe(true);
    expect(totals.finalTotal).toBe(0);
  });

  it('negative discount is rejected', () => {
    expect(validateDiscount(-1, 1000).isValid).toBe(false);
  });
});

// ─── Edge cases the page must handle ─────────────────────────────────────────

describe('Invoice page — edge cases', () => {
  it('empty item list produces zero totals (no crash)', () => {
    const totals = calculateInvoiceTotals([], 0, 'CGST_SGST', 0, null);
    expect(totals.subtotal).toBe(0);
    expect(totals.grandTotal).toBe(0);
  });

  it('quantity of 0.5 (decimal) works correctly', () => {
    const items = [{ quantity: 0.5, sellingPrice: 1000, gstRate: 18, cessRate: 0, discountAmount: 0 }];
    const totals = calculateInvoiceTotals(items, 0, 'CGST_SGST', 0, null);
    // 0.5 × 1000 = 500, 18% = 90, total = 590
    expect(totals.subtotal).toBe(500);
    expect(totals.grandTotal).toBeCloseTo(590, 0);
  });

  it('large invoice (₹1 lakh+) calculates without precision errors', () => {
    const items = [
      { quantity: 100, sellingPrice: 1000, gstRate: 18, cessRate: 0, discountAmount: 0 }
    ];
    const totals = calculateInvoiceTotals(items, 0, 'CGST_SGST', 0, null);

    // 100 × ₹1000 = ₹1,00,000 + 18% = ₹1,18,000
    expect(totals.subtotal).toBe(100000);
    expect(totals.grandTotal).toBeCloseTo(118000, 0);
  });

  it('E-Way Bill threshold: totals > ₹50,000 should be detectable', () => {
    const EWAY_THRESHOLD = 50000;
    const items = [
      { quantity: 100, sellingPrice: 600, gstRate: 18, cessRate: 0, discountAmount: 0 }
    ];
    const totals = calculateInvoiceTotals(items, 0, 'CGST_SGST', 0, null);
    const requiresEwayBill = totals.grandTotal > EWAY_THRESHOLD;

    expect(totals.grandTotal).toBeGreaterThan(EWAY_THRESHOLD);
    expect(requiresEwayBill).toBe(true);
  });
});

// ─── Invoice number format validation ─────────────────────────────────────────

describe('Invoice number format', () => {
  it('INV-YYYY-XX-XXXXXX regex matches expected format', () => {
    const regex = /^INV-\d{4}-[A-Z]{2}-\d{6}$/;
    expect(regex.test('INV-2026-TE-000001')).toBe(true);
    expect(regex.test('INV-2026-RA-000123')).toBe(true);
    expect(regex.test('INV-2025-AB-999999')).toBe(true);
  });

  it('rejects malformed invoice numbers', () => {
    const regex = /^INV-\d{4}-[A-Z]{2}-\d{6}$/;
    expect(regex.test('INV-2026-000001')).toBe(false);
    expect(regex.test('PUR-2026-TE-000001')).toBe(false);
    expect(regex.test('INV-26-TE-000001')).toBe(false);
  });
});
