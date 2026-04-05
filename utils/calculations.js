/**
 * Shared Calculation Utilities for Digibilling Frontend
 *
 * IMPORTANT: These calculations match the backend logic in be-digibilling/utils/gstCalculations.js
 * Any changes here should be reflected in backend and vice versa.
 *
 * @module calculations
 */

/**
 * Calculate invoice totals with GST and discounts
 *
 * Calculation Order (matches backend):
 * 1. Calculate raw subtotal (sum of all items before discount)
 * 2. Apply item-level discounts OR invoice-level discount (NEW: supports both)
 * 3. Apply GST on discounted amounts
 * 4. Calculate grand total with round-off
 *
 * @param {Array} items - Array of invoice items with { quantity, sellingPrice, gstRate, cessRate, discountAmount }
 * @param {Number} discount - Invoice-level discount amount (ONLY used if items don't have their own discounts)
 * @param {String} taxType - 'CGST_SGST', 'IGST', or 'CESS'
 * @param {Number} cessRate - Manual CESS rate (only used when taxType === 'CESS')
 * @param {Object} shopSettings - Shop settings object with { gstScheme }
 * @returns {Object} { subtotal, totalDiscount, totalTax, totalCess, grandTotal, roundOff, finalTotal, hasItemDiscounts }
 *
 * @example
 * // Item-level discount (NEW):
 * const items = [
 *   { quantity: 1, sellingPrice: 200, gstRate: 12, discountAmount: 50 }
 * ];
 * const totals = calculateInvoiceTotals(items, 0, 'CGST_SGST', 0, shopSettings);
 * // Returns: { subtotal: 200, totalDiscount: 50, totalTax: 18, grandTotal: 168, ... }
 *
 * // Invoice-level discount (backward compatibility):
 * const items = [
 *   { quantity: 2, sellingPrice: 500, gstRate: 18, cessRate: 0 }
 * ];
 * const totals = calculateInvoiceTotals(items, 100, 'CGST_SGST', 0, shopSettings);
 * // Returns: { subtotal: 1000, totalDiscount: 100, totalTax: 162, grandTotal: 1062, ... }
 */
export const calculateInvoiceTotals = (
  items = [],
  discount = 0,
  taxType = 'CGST_SGST',
  cessRate = 0,
  shopSettings = null
) => {
  // Step 1: Calculate raw subtotal (before any discounts)
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.sellingPrice || 0);
  }, 0);

  // Step 2: Check if items have their own discounts
  const hasItemDiscounts = items.some(item => (item.discountAmount || 0) > 0);

  let totalDiscount = 0;
  let totalTax = 0;
  let totalCess = 0;

  // Step 3: Calculate totals based on discount type
  if (hasItemDiscounts) {
    // NEW: Item-level discount mode
    // Each item has its own discount, calculate per item
    totalDiscount = items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);

    if (shopSettings?.gstScheme === 'COMPOSITION') {
      totalTax = 0;
      totalCess = 0;
    } else if (taxType === 'CESS') {
      // Apply CESS on each item after its discount
      totalCess = items.reduce((sum, item) => {
        const itemTotal = (item.quantity || 0) * (item.sellingPrice || 0);
        const itemAfterDiscount = itemTotal - (item.discountAmount || 0);
        return sum + (itemAfterDiscount * cessRate) / 100;
      }, 0);
    } else {
      // Calculate GST on each item after its own discount
      totalTax = items.reduce((sum, item) => {
        const itemTotal = (item.quantity || 0) * (item.sellingPrice || 0);
        const itemAfterDiscount = itemTotal - (item.discountAmount || 0);
        return sum + (itemAfterDiscount * (item.gstRate || 0)) / 100;
      }, 0);

      totalCess = items.reduce((sum, item) => {
        const itemTotal = (item.quantity || 0) * (item.sellingPrice || 0);
        const itemAfterDiscount = itemTotal - (item.discountAmount || 0);
        return sum + (itemAfterDiscount * (item.cessRate || 0)) / 100;
      }, 0);
    }
  } else {
    // OLD: Invoice-level discount mode (for backward compatibility)
    totalDiscount = discount;
    const subtotalAfterDiscount = subtotal - discount;

    if (shopSettings?.gstScheme === 'COMPOSITION') {
      totalTax = 0;
      totalCess = 0;
    } else if (taxType === 'CESS') {
      totalCess = (subtotalAfterDiscount * cessRate) / 100;
    } else {
      // Calculate discount ratio for proportional distribution
      const discountRatio = subtotal > 0 ? subtotalAfterDiscount / subtotal : 1;

      totalTax = items.reduce((sum, item) => {
        const itemTotal = (item.quantity || 0) * (item.sellingPrice || 0);
        const itemAfterDiscount = itemTotal * discountRatio;
        return sum + (itemAfterDiscount * (item.gstRate || 0)) / 100;
      }, 0);

      totalCess = items.reduce((sum, item) => {
        const itemTotal = (item.quantity || 0) * (item.sellingPrice || 0);
        const itemAfterDiscount = itemTotal * discountRatio;
        return sum + (itemAfterDiscount * (item.cessRate || 0)) / 100;
      }, 0);
    }
  }

  // Step 4: Calculate grand total
  const subtotalAfterDiscount = subtotal - totalDiscount;
  const grandTotal = subtotalAfterDiscount + totalTax + totalCess;
  const roundOff = Math.round(grandTotal) - grandTotal;
  const finalTotal = Math.round(grandTotal);

  return {
    subtotal,
    totalDiscount,
    totalTax,
    totalCess,
    grandTotal,
    roundOff,
    finalTotal,
    hasItemDiscounts
  };
};

/**
 * Calculate purchase totals with GST and discounts
 *
 * Similar to invoice calculation but uses purchasePrice instead of sellingPrice
 *
 * @param {Array} items - Array of purchase items with { quantity, purchasePrice, gstRate, cessRate }
 * @param {Number} discount - Purchase-level discount amount (applied BEFORE GST)
 * @param {String} taxType - 'CGST_SGST', 'IGST', or 'CESS'
 * @param {Number} cessRate - Manual CESS rate (only used when taxType === 'CESS')
 * @param {Object} additionalCharges - { freightCharges, packagingCharges, otherCharges }
 * @param {Object} shopSettings - Shop settings object with { gstScheme }
 * @returns {Object} { subtotal, totalTax, totalCess, grandTotal, roundOff, finalTotal }
 */
export const calculatePurchaseTotals = (
  items = [],
  discount = 0,
  taxType = 'CGST_SGST',
  cessRate = 0,
  additionalCharges = {},
  shopSettings = null
) => {
  // Step 1: Calculate raw subtotal
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.purchasePrice || 0);
  }, 0);

  // Step 2: Apply discount BEFORE GST calculation
  const subtotalAfterDiscount = subtotal - discount;

  // Step 3: Initialize tax variables
  let totalTax = 0;
  let totalCess = 0;

  // Step 4: Calculate taxes (same logic as invoice)
  if (shopSettings?.gstScheme === 'COMPOSITION') {
    totalTax = 0;
    totalCess = 0;
  } else if (taxType === 'CESS') {
    totalCess = (subtotalAfterDiscount * cessRate) / 100;
  } else {
    const discountRatio = subtotal > 0 ? subtotalAfterDiscount / subtotal : 1;

    totalTax = items.reduce((sum, item) => {
      const itemTotal = (item.quantity || 0) * (item.purchasePrice || 0);
      const itemAfterDiscount = itemTotal * discountRatio;
      return sum + (itemAfterDiscount * (item.gstRate || 0)) / 100;
    }, 0);

    totalCess = items.reduce((sum, item) => {
      const itemTotal = (item.quantity || 0) * (item.purchasePrice || 0);
      const itemAfterDiscount = itemTotal * discountRatio;
      return sum + (itemAfterDiscount * (item.cessRate || 0)) / 100;
    }, 0);
  }

  // Step 5: Add additional charges
  const additionalTotal =
    (additionalCharges.freightCharges || 0) +
    (additionalCharges.packagingCharges || 0) +
    (additionalCharges.otherCharges || 0);

  // Step 6: Calculate grand total
  const grandTotal = subtotalAfterDiscount + totalTax + totalCess + additionalTotal;
  const roundOff = Math.round(grandTotal) - grandTotal;
  const finalTotal = Math.round(grandTotal);

  return {
    subtotal,
    totalTax,
    totalCess,
    additionalCharges: additionalTotal,
    grandTotal,
    roundOff,
    finalTotal
  };
};

/**
 * Calculate single item total with GST
 * Useful for displaying item-level totals in the UI
 *
 * @param {Number} quantity - Item quantity
 * @param {Number} price - Item price (sellingPrice or purchasePrice)
 * @param {Number} gstRate - GST rate percentage (0, 5, 12, 18, 28, etc.)
 * @param {Number} cessRate - CESS rate percentage (optional)
 * @returns {Number} Total amount including GST and CESS
 *
 * @example
 * calculateItemTotal(2, 500, 18, 0) // Returns: 1180 (₹500 × 2 × 1.18)
 */
export const calculateItemTotal = (quantity = 0, price = 0, gstRate = 0, cessRate = 0) => {
  const baseAmount = quantity * price;
  const gstAmount = (baseAmount * gstRate) / 100;
  const cessAmount = (baseAmount * cessRate) / 100;
  return baseAmount + gstAmount + cessAmount;
};

/**
 * Calculate single item total with its own discount and GST
 * NEW: Supports item-level discountAmount (₹)
 *
 * @param {Object} item - Item object with { quantity, sellingPrice, discountAmount, gstRate, cessRate }
 * @param {Object} shopSettings - Shop settings object with { gstScheme }
 * @returns {Object} { itemTotal, baseAmount, discountAmount, taxableAmount, taxAmount }
 *
 * @example
 * const item = { quantity: 1, sellingPrice: 200, discountAmount: 50, gstRate: 12, cessRate: 0 };
 * calculateItemWithDiscount(item, shopSettings);
 * // Returns: { itemTotal: 168, baseAmount: 200, discountAmount: 50, taxableAmount: 150, taxAmount: 18 }
 */
export const calculateItemWithDiscount = (
  item = {},
  shopSettings = null
) => {
  const quantity = item.quantity || 0;
  const price = item.sellingPrice || 0;
  const gstRate = item.gstRate || 0;
  const cessRate = item.cessRate || 0;
  const discountAmount = item.discountAmount || 0;

  // Calculate base amount (before discount)
  const baseAmount = quantity * price;

  // Apply item's own discount
  const taxableAmount = baseAmount - discountAmount;

  // Skip tax calculation for Composition Scheme
  let taxAmount = 0;
  if (shopSettings?.gstScheme !== 'COMPOSITION') {
    taxAmount = (taxableAmount * (gstRate + cessRate)) / 100;
  }

  // Calculate final item total (after discount + tax)
  const itemTotal = taxableAmount + taxAmount;

  return {
    itemTotal,
    baseAmount,
    discountAmount,
    taxableAmount,
    taxAmount
  };
};

/**
 * Calculate item display details with proportional discount (for backward compatibility)
 * Returns item total AFTER applying proportional invoice-level discount and GST
 * Also returns discount percentage for display purposes
 *
 * @param {Object} item - Item object with { quantity, sellingPrice, gstRate, cessRate }
 * @param {Number} invoiceDiscount - Total invoice-level discount
 * @param {Number} invoiceSubtotal - Invoice subtotal (before discount)
 * @param {Object} shopSettings - Shop settings object with { gstScheme }
 * @returns {Object} { itemTotal, discountPercent, baseAmount, taxAmount }
 *
 * @example
 * const item = { quantity: 1, sellingPrice: 200, gstRate: 12, cessRate: 0 };
 * calculateItemDisplayTotal(item, 100, 200, shopSettings);
 * // Returns: { itemTotal: 112, discountPercent: 50, baseAmount: 100, taxAmount: 12 }
 */
export const calculateItemDisplayTotal = (
  item = {},
  invoiceDiscount = 0,
  invoiceSubtotal = 0,
  shopSettings = null
) => {
  const quantity = item.quantity || 0;
  const price = item.sellingPrice || 0;
  const gstRate = item.gstRate || 0;
  const cessRate = item.cessRate || 0;

  // Calculate base amount (before discount and GST)
  const baseAmount = quantity * price;

  // Calculate discount ratio for proportional distribution
  const discountRatio = invoiceSubtotal > 0 ? (invoiceSubtotal - invoiceDiscount) / invoiceSubtotal : 1;

  // Calculate discount percentage for this item
  const discountPercent = ((1 - discountRatio) * 100);

  // Apply proportional discount to this item
  const baseAmountAfterDiscount = baseAmount * discountRatio;

  // Skip tax calculation for Composition Scheme
  let taxAmount = 0;
  if (shopSettings?.gstScheme !== 'COMPOSITION') {
    taxAmount = (baseAmountAfterDiscount * (gstRate + cessRate)) / 100;
  }

  // Calculate final item total (after discount + tax)
  const itemTotal = baseAmountAfterDiscount + taxAmount;

  return {
    itemTotal,
    discountPercent,
    baseAmount,
    baseAmountAfterDiscount,
    taxAmount
  };
};

/**
 * Validate discount amount
 * Ensures discount doesn't exceed subtotal
 *
 * @param {Number} discount - Discount amount
 * @param {Number} subtotal - Subtotal amount
 * @returns {Object} { isValid: boolean, error: string|null }
 *
 * @example
 * validateDiscount(150, 100) // Returns: { isValid: false, error: 'Discount cannot be greater than subtotal' }
 * validateDiscount(50, 100) // Returns: { isValid: true, error: null }
 */
export const validateDiscount = (discount, subtotal) => {
  if (discount < 0) {
    return {
      isValid: false,
      error: 'Discount cannot be negative'
    };
  }

  if (discount > subtotal) {
    return {
      isValid: false,
      error: `Discount (₹${discount.toFixed(2)}) cannot be greater than Subtotal (₹${subtotal.toFixed(2)})`
    };
  }

  return {
    isValid: true,
    error: null
  };
};

/**
 * Validate invoice totals
 * Ensures final total is valid
 *
 * @param {Object} totals - Totals object from calculateInvoiceTotals
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export const validateInvoiceTotals = (totals) => {
  if (totals.finalTotal < 0) {
    return {
      isValid: false,
      error: 'Invoice total cannot be negative. Please reduce the discount amount.'
    };
  }

  if (totals.finalTotal === 0) {
    return {
      isValid: true,
      error: null,
      warning: 'Invoice total is ₹0. This is allowed but unusual.'
    };
  }

  return {
    isValid: true,
    error: null
  };
};

/**
 * Format currency for display
 *
 * @param {Number} amount - Amount to format
 * @param {Boolean} showSymbol - Whether to show ₹ symbol (default: true)
 * @returns {String} Formatted currency string
 *
 * @example
 * formatCurrency(1234.56) // Returns: "₹1,234.56"
 * formatCurrency(1234.56, false) // Returns: "1,234.56"
 */
export const formatCurrency = (amount, showSymbol = true) => {
  const formatted = Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return showSymbol ? `₹${formatted}` : formatted;
};

/**
 * Round to 2 decimal places
 *
 * @param {Number} value - Value to round
 * @returns {Number} Rounded value
 */
export const roundTo2Decimals = (value) => {
  return Math.round(value * 100) / 100;
};

/**
 * Build HSN/SAC-wise tax summary for invoice templates (Tally Portrait & Landscape).
 * Groups items by HSN/SAC code and aggregates taxable value and tax amounts.
 * Uses item.taxableAmount (after discount) as the authoritative taxable value.
 *
 * @param {Array} items - Invoice items with { hsnCode, sacCode, gstRate, taxableAmount, totalAmount, sellingPrice, quantity, discountAmount }
 * @param {String} taxType - 'CGST_SGST' or 'IGST'
 * @returns {Array} hsnRows - Array of [hsnCode, { taxableValue, cgst, sgst, igst, rate }] entries
 *
 * @example
 * const hsnRows = buildHsnSummary(invoice.items, invoice.taxType);
 */
export const buildHsnSummary = (items = [], taxType = 'CGST_SGST') => {
  const hsnMap = {};
  items.forEach(item => {
    const key = item.hsnCode || item.sacCode || 'N/A';
    if (!hsnMap[key]) {
      hsnMap[key] = { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, rate: item.gstRate };
    }
    // Use stored taxableAmount (post-discount) — the amount GST was actually applied on
    const taxable = item.taxableAmount !== undefined
      ? item.taxableAmount
      : (item.sellingPrice * item.quantity - (item.discountAmount || 0));
    const taxAmt = item.totalAmount - taxable;
    hsnMap[key].taxableValue += taxable;
    if (taxType === 'CGST_SGST') {
      hsnMap[key].cgst += taxAmt / 2;
      hsnMap[key].sgst += taxAmt / 2;
    } else {
      hsnMap[key].igst += taxAmt;
    }
  });
  return Object.entries(hsnMap);
};

// Default export for convenience
export default {
  calculateInvoiceTotals,
  calculatePurchaseTotals,
  calculateItemTotal,
  calculateItemWithDiscount,
  calculateItemDisplayTotal,
  buildHsnSummary,
  validateDiscount,
  validateInvoiceTotals,
  formatCurrency,
  roundTo2Decimals
};
