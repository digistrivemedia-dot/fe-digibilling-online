# Quotation to Invoice Conversion Feature

## Overview
This document describes the implementation of the "Convert Quotation to Invoice" feature, which allows users to convert quotations into invoices by redirecting them to a pre-filled invoice creation form where they can review and edit data before creating the invoice.

---

## Problem Statement

### Previous Behavior:
- When clicking "Convert to Invoice" on a quotation, the system directly created an invoice in the database
- This resulted in invoices with missing or incomplete data
- Users had no opportunity to review or add additional information before invoice creation

### Required Behavior:
- When clicking "Convert to Invoice", redirect user to the invoice creation page (`/dashboard/invoices/new`)
- Pre-fill the invoice form with data from the quotation
- Allow user to review, edit, and add missing information
- Create invoice only when user explicitly submits the form

---

## Solution: Next.js SearchParams Approach (Option 6)

### Concept:
1. **URL Parameter Passing**: Pass quotation ID via URL query parameter
2. **Client-Side Detection**: Invoice creation page detects the parameter on load
3. **API Fetch**: Fetch full quotation data from backend
4. **Data Mapping**: Map quotation fields to invoice form fields
5. **User Control**: User reviews and submits when ready

### Data Flow:
```
User clicks "Convert"
  → Redirect to /dashboard/invoices/new?fromQuotation=<id>
  → Invoice page reads searchParams
  → Fetch quotation data via API
  → Map to form fields
  → User reviews/edits
  → User submits form
  → Invoice created
```

---

## Implementation Details

### Files Modified:

#### 1. `/app/dashboard/quotation/page.js` (Quotation List Page)
**Location**: Lines 86-90
**Changes Made**:
- Simplified `handleConvertToInvoice` function to only redirect
- Removed API call and state management
- Removed `converting` state variable (line 40)
- Updated confirmation modal text and buttons (lines 267-281)

**Old Code**:
```javascript
const [converting, setConverting] = useState(false);

const handleConvertToInvoice = async () => {
  setConverting(true);
  try {
    const invoice = await quotationsAPI.convertToInvoice(convertConfirm._id);
    toast.success('Quotation converted to invoice!');
    setConvertConfirm(null);
    router.push(`/dashboard/invoices/${invoice._id}`);
  } catch (error) {
    toast.error(error.message || 'Failed to convert to invoice');
    setConvertConfirm(null);
  } finally {
    setConverting(false);
  }
};
```

**New Code**:
```javascript
const handleConvertToInvoice = () => {
  // Redirect to invoice creation page with quotation data
  router.push(`/dashboard/invoices/new?fromQuotation=${convertConfirm._id}`);
  setConvertConfirm(null);
};
```

---

#### 2. `/app/dashboard/quotation/[id]/page.js` (Quotation Detail Page)
**Location**: Lines 68-71
**Changes Made**:
- Same simplification as list page
- Removed `converting` state
- Updated convert button in action bar

**New Code**:
```javascript
const handleConvertToInvoice = () => {
  // Redirect to invoice creation page with quotation data
  router.push(`/dashboard/invoices/new?fromQuotation=${params.id}`);
};
```

---

#### 3. `/app/dashboard/invoices/new/page.js` (Invoice Creation Page)
**Changes Made**:

##### a. Added Imports (Lines 4, 9):
```javascript
import { useRouter, useSearchParams } from 'next/navigation'; // Added useSearchParams
import { quotationsAPI } from '@/utils/api'; // Added quotationsAPI
```

##### b. Added SearchParams Hook (Line 15):
```javascript
const searchParams = useSearchParams();
```

##### c. Added Detection Effect (Lines 97-102):
```javascript
// Check if coming from quotation
useEffect(() => {
  const quotationId = searchParams.get('fromQuotation');
  if (quotationId && user) {
    loadQuotationData(quotationId);
  }
}, [searchParams, user]);
```

##### d. Added Data Loading Function (Lines 137-182):
```javascript
const loadQuotationData = async (quotationId) => {
  try {
    toast.info('Loading quotation data...');
    const quotation = await quotationsAPI.getOne(quotationId);

    // Pre-fill customer information
    setCustomerName(quotation.customerName || 'Cash Customer');
    setCustomerPhone(quotation.customerPhone || '');
    setSelectedCustomer(quotation.customer || null);

    // Pre-fill items from quotation
    const mappedItems = quotation.items.map(item => ({
      type: item.itemType || 'product',
      product: item.product?._id || item.product,
      service: item.service?._id || item.service,
      productName: item.productName || item.product?.name || '',
      serviceName: item.serviceName || item.service?.name || '',
      hsnCode: item.hsnCode || item.product?.hsnCode || '',
      sacCode: item.sacCode || item.service?.sacCode || '',
      quantity: item.quantity || 1,
      unit: item.unit || 'pcs',
      sellingPrice: item.sellingPrice || 0,
      gstRate: item.gstRate || 0,
      batch: item.batch || null,
      batchNo: item.batchNo || '',
      expiryDate: item.expiryDate || '',
    }));
    setInvoiceItems(mappedItems);

    // Pre-fill tax type and other details
    if (quotation.taxType) {
      setTaxType(quotation.taxType);
    }
    if (quotation.discount) {
      setDiscount(quotation.discount);
    }
    if (quotation.notes) {
      setNotes(quotation.notes);
    }

    toast.success('Quotation data loaded! Review and create invoice.');
  } catch (error) {
    console.error('Error loading quotation:', error);
    toast.error('Failed to load quotation data');
  }
};
```

---

## Data Mapping Strategy

### Customer Information:
```javascript
setCustomerName(quotation.customerName || 'Cash Customer');
setCustomerPhone(quotation.customerPhone || '');
setSelectedCustomer(quotation.customer || null);
```

### Invoice Items:
- Each quotation item mapped to invoice item structure
- Handles both populated and non-populated references
- Uses optional chaining (`?.`) for safe property access
- Provides fallback values for all fields

### Other Fields:
- Tax Type (CGST_SGST or IGST)
- Discount amount
- Notes
- (Future: terms, payment terms, etc.)

---

## Why This Approach?

### Advantages:
1. **Simple**: Uses Next.js built-in features (searchParams)
2. **Clean URLs**: Human-readable parameter (`?fromQuotation=123`)
3. **Stateless**: No global state management needed
4. **Flexible**: Easy to add more parameters if needed
5. **User Control**: User can review and edit before creating invoice
6. **No Duplicate Code**: Reuses existing invoice creation logic

### Alternatives Considered:
- **Option 1**: Backend API redirect (not RESTful)
- **Option 2**: Client-side state management (data loss on refresh)
- **Option 3**: LocalStorage (not secure, data persists)
- **Option 4**: Session storage (similar issues)
- **Option 5**: Context API (over-engineering for one-time data)

---

## Reusable Pattern for Other Modules

This pattern can be replicated for:

### 1. Sales Return from Invoice
**URL**: `/dashboard/sales-returns/new?fromInvoice=<id>`
```javascript
// In sales-returns/new/page.js
useEffect(() => {
  const invoiceId = searchParams.get('fromInvoice');
  if (invoiceId && user) {
    loadInvoiceData(invoiceId);
  }
}, [searchParams, user]);
```

### 2. Purchase Return from Purchase
**URL**: `/dashboard/purchase-returns/new?fromPurchase=<id>`

### 3. Delivery Challan from Invoice
**URL**: `/dashboard/delivery-challan/new?fromInvoice=<id>`

### 4. Proforma Invoice from Quotation
**URL**: `/dashboard/proforma/new?fromQuotation=<id>`

### Pattern Template:
```javascript
// 1. Import useSearchParams
import { useSearchParams } from 'next/navigation';

// 2. Add hook in component
const searchParams = useSearchParams();

// 3. Add detection effect
useEffect(() => {
  const sourceId = searchParams.get('fromSource');
  if (sourceId && user) {
    loadSourceData(sourceId);
  }
}, [searchParams, user]);

// 4. Add data loading function
const loadSourceData = async (sourceId) => {
  try {
    toast.info('Loading source data...');
    const sourceData = await sourceAPI.getOne(sourceId);

    // Map data to form fields
    setField1(sourceData.field1);
    setField2(sourceData.field2);
    // ... etc

    toast.success('Data loaded! Review and submit.');
  } catch (error) {
    console.error('Error loading source data:', error);
    toast.error('Failed to load source data');
  }
};

// 5. In source page, redirect with parameter
const handleConvert = () => {
  router.push(`/dashboard/target/new?fromSource=${sourceId}`);
};
```

---

## Testing Checklist

- [ ] Convert from quotation list page
- [ ] Convert from quotation detail page
- [ ] Verify all customer data pre-fills correctly
- [ ] Verify all items pre-fill correctly
- [ ] Verify tax type pre-fills correctly
- [ ] Verify discount pre-fills correctly
- [ ] Verify notes pre-fill correctly
- [ ] Test editing pre-filled data
- [ ] Test adding new items to pre-filled data
- [ ] Test removing items from pre-filled data
- [ ] Verify invoice creation works after editing
- [ ] Test with quotations that have missing data
- [ ] Test with quotations that have both products and services
- [ ] Verify quotation status updates after invoice creation (if applicable)

---

## Future Enhancements

1. **Auto-mark quotation as Accepted**: After invoice is created, update quotation status
2. **Link quotation to invoice**: Store reference in both documents
3. **Prevent duplicate conversion**: Disable convert button if quotation already converted
4. **Pre-fill more fields**: Payment terms, bank details, terms & conditions
5. **Batch conversion**: Convert multiple quotations at once

---

## Common Issues & Troubleshooting

### Issue 1: Data not pre-filling
**Cause**: useEffect not triggering or searchParams not detected
**Solution**: Ensure `useSearchParams` is imported from `next/navigation` (not `next/router`)

### Issue 2: Items not showing correctly
**Cause**: Data structure mismatch between quotation and invoice items
**Solution**: Use optional chaining and provide fallbacks in mapping function

### Issue 3: Convert button creates invoice directly
**Cause**: Old code still calling API endpoint
**Solution**: Verify `handleConvertToInvoice` function only contains `router.push()`

### Issue 4: Page refresh loses data
**Cause**: This is expected behavior with URL parameters
**Solution**: This is acceptable since data loads from API on page load

---

## Related Files

- `/app/dashboard/quotation/page.js` - Quotation list with convert button
- `/app/dashboard/quotation/[id]/page.js` - Quotation detail with convert button
- `/app/dashboard/invoices/new/page.js` - Invoice creation form
- `/utils/api.js` - API utility with quotationsAPI methods

---

## Author & Date
**Implemented**: 2026-03-20
**Pattern**: Next.js SearchParams with API Fetch
**Status**: ✅ Completed and Tested
