'use client';

import { useToast } from '@/context/ToastContext';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import PageLoader from '@/components/PageLoader';
import { purchasesAPI, suppliersAPI, productsAPI } from '@/utils/api';
import { calculatePurchaseTotals, calculateItemTotal as calcItemTotal, validateDiscount } from '@/utils/calculations';
import { HiArrowLeft, HiExclamation } from 'react-icons/hi';
import Link from 'next/link';

export default function EditPurchasePage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [originalPurchase, setOriginalPurchase] = useState(null);
  const [inventoryWarnings, setInventoryWarnings] = useState([]);
  const [formData, setFormData] = useState({
    supplier: '',
    billNumber: '',
    billDate: new Date().toISOString().split('T')[0],
    purchaseDate: new Date().toISOString().split('T')[0],
    items: [],
    freightCharges: 0,
    packagingCharges: 0,
    otherCharges: 0,
    discount: 0,
    paymentStatus: 'UNPAID',
    paymentMode: 'CREDIT',
    paidAmount: 0,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [purchaseData, suppliersData, productsData] = await Promise.all([
        purchasesAPI.getOne(params.id),
        suppliersAPI.getAll({ isActive: true }),
        productsAPI.getAll()
      ]);

      setOriginalPurchase(purchaseData);
      setSuppliers(suppliersData);
      setProducts(productsData);

      // Pre-fill form with existing purchase data
      setFormData({
        supplier: purchaseData.supplier?._id || purchaseData.supplier || '',
        billNumber: purchaseData.supplierInvoiceNo || purchaseData.billNumber || '',
        billDate: purchaseData.billDate ? new Date(purchaseData.billDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        purchaseDate: purchaseData.purchaseDate ? new Date(purchaseData.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        items: purchaseData.items.map(item => ({
          product: item.product?._id || item.product,
          productName: item.productName || item.product?.name || '',
          batchNo: item.batchNo || item.batch?.batchNo || '',
          expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : (item.batch?.expiryDate ? new Date(item.batch.expiryDate).toISOString().split('T')[0] : ''),
          quantity: item.quantity || 1,
          originalQuantity: item.quantity || 1, // Store original quantity for inventory validation
          freeQuantity: item.freeQuantity || 0,
          purchasePrice: item.purchasePrice || 0,
          mrp: item.mrp || 0,
          sellingPrice: item.sellingPrice || 0,
          gstRate: item.gstRate || 12,
          discount: item.discount || 0,
          unit: item.unit || 'PCS',
          hsnCode: item.hsnCode || ''
        })),
        freightCharges: purchaseData.freight || 0,
        packagingCharges: purchaseData.packaging || 0,
        otherCharges: purchaseData.otherCharges || 0,
        discount: purchaseData.discount || 0,
        paymentStatus: purchaseData.paymentStatus || 'UNPAID',
        paymentMode: purchaseData.paymentMethod || 'CREDIT',
        paidAmount: purchaseData.paidAmount || 0,
        notes: purchaseData.notes || ''
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(error.message || 'Failed to load purchase data');
      router.push('/dashboard/purchases');
    } finally {
      setLoadingData(false);
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    const item = newItems[index];

    // Update the field
    newItems[index] = { ...item, [field]: value };

    // Check for inventory warnings when quantity is reduced
    if (field === 'quantity') {
      checkInventoryWarnings(newItems);
    }

    setFormData({ ...formData, items: newItems });
  };

  const checkInventoryWarnings = (items) => {
    const warnings = [];

    items.forEach((item, index) => {
      const quantityReduction = item.originalQuantity - item.quantity;

      if (quantityReduction > 0) {
        // Find the product to check current stock
        const product = products.find(p => p._id === item.product);

        if (product && product.stockQuantity < quantityReduction) {
          warnings.push({
            index,
            productName: item.productName,
            message: `Reducing quantity by ${quantityReduction} but current stock is only ${product.stockQuantity}. This may result in negative inventory.`
          });
        }
      }
    });

    setInventoryWarnings(warnings);
  };

  const calculateItemTotal = (item) => {
    // Use shared calculation utility for item total
    return calcItemTotal(item.quantity, item.purchasePrice, item.gstRate, item.cessRate || 0);
  };

  const calculateTotals = () => {
    // Use shared calculation utility (matches backend logic)
    // FIX: Previous calculation was subtracting GST from total (backwards!)
    const additionalCharges = {
      freightCharges: formData.freightCharges || 0,
      packagingCharges: formData.packagingCharges || 0,
      otherCharges: formData.otherCharges || 0
    };

    const result = calculatePurchaseTotals(
      formData.items,
      formData.discount || 0,
      formData.taxType || 'CGST_SGST',
      0, // cessRate
      additionalCharges,
      null // shopSettings
    );

    return {
      subtotal: result.subtotal,
      totalGST: result.totalTax,
      grandTotal: result.finalTotal
    };
  };

  const validateForm = () => {
    const newErrors = {};

    // Supplier is mandatory
    if (!formData.supplier || formData.supplier === '') {
      newErrors.supplier = 'Please select a supplier';
    }

    // At least one item is mandatory
    if (formData.items.length === 0) {
      newErrors.items = 'Please add at least one item to the purchase';
    }

    // Check if all items have products selected
    const emptyProductIndex = formData.items.findIndex(item => !item.product || item.product === '');
    if (emptyProductIndex !== -1) {
      toast.error(`Please select a product for item #${emptyProductIndex + 1}`);
      return false;
    }

    // Check if all items have quantity > 0
    const zeroQuantityIndex = formData.items.findIndex(item => !item.quantity || item.quantity <= 0);
    if (zeroQuantityIndex !== -1) {
      toast.error(`Please enter quantity for item #${zeroQuantityIndex + 1}`);
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form first
    if (!validateForm()) {
      toast.error('Please fill all required fields');
      return;
    }

    // Show warning if inventory might go negative
    if (inventoryWarnings.length > 0) {
      const confirmUpdate = window.confirm(
        `Warning: ${inventoryWarnings.length} item(s) may result in negative inventory. Do you want to continue?\n\n` +
        inventoryWarnings.map(w => `- ${w.productName}: ${w.message}`).join('\n')
      );

      if (!confirmUpdate) {
        return;
      }
    }

    setLoading(true);

    try {
      const totals = calculateTotals();
      const purchaseData = {
        supplier: formData.supplier,
        billNumber: formData.billNumber,
        billDate: formData.billDate,
        purchaseDate: formData.purchaseDate,
        items: formData.items.map(item => ({
          product: item.product,
          batchNo: item.batchNo,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          freeQuantity: item.freeQuantity,
          purchasePrice: item.purchasePrice,
          mrp: item.mrp,
          sellingPrice: item.sellingPrice,
          gstRate: item.gstRate,
          discount: item.discount
        })),
        freightCharges: formData.freightCharges,
        packagingCharges: formData.packagingCharges,
        otherCharges: formData.otherCharges,
        discount: formData.discount,
        paymentStatus: formData.paymentStatus,
        paymentMode: formData.paymentMode,
        paidAmount: formData.paidAmount,
        notes: formData.notes,
        subtotal: totals.subtotal,
        totalGST: totals.totalGST,
        grandTotal: totals.grandTotal
      };

      await purchasesAPI.update(params.id, purchaseData);
      toast.success('Purchase updated successfully!');
      router.push(`/dashboard/purchases/${params.id}`);
    } catch (error) {
      // Parse backend validation errors and show user-friendly messages
      let errorMessage = error.message || 'An error occurred';

      // Convert technical errors to user-friendly messages
      if (errorMessage.includes('Cast to ObjectId failed') && errorMessage.includes('Product')) {
        errorMessage = 'Please select a valid product for all items';
      } else if (errorMessage.includes('validation failed')) {
        errorMessage = 'Please check all fields and try again';
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <PageLoader text="Loading purchase data..." />;
  }

  const totals = calculateTotals();

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/purchases/${params.id}`} className="text-gray-600 hover:text-gray-900">
            <HiArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Purchase Entry</h1>
            <p className="text-gray-500 mt-1">
              {originalPurchase?.purchaseNumber && `Purchase #${originalPurchase.purchaseNumber}`}
            </p>
          </div>
        </div>

        {/* Inventory Warnings */}
        {inventoryWarnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HiExclamation className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-900 mb-2">Inventory Warnings</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  {inventoryWarnings.map((warning, idx) => (
                    <li key={idx}>
                      <strong>Item #{warning.index + 1} ({warning.productName}):</strong> {warning.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-black">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <select
                      value={formData.supplier}
                      onChange={(e) => {
                        setFormData({ ...formData, supplier: e.target.value });
                        if (errors.supplier) {
                          setErrors({ ...errors, supplier: '' });
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 ${errors.supplier
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-emerald-500'
                        }`}
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier._id} value={supplier._id}>
                          {supplier.name} - {supplier.gstin}
                        </option>
                      ))}
                    </select>
                    {errors.supplier && (
                      <p className="text-sm text-red-600 flex items-center mt-1">
                        <HiExclamation className="w-4 h-4 mr-1" />
                        {errors.supplier}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Bill Number
                  <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.billNumber}
                  onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter bill number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bill Date
                  <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={formData.billDate}
                  onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Date
                  <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Items Section - Read-only products, editable quantities and prices */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Items <span className="text-red-500">*</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Note: Products cannot be changed. Only quantities, prices, and other details can be edited.
                </p>
                {errors.items && (
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <HiExclamation className="w-4 h-4 mr-1" />
                    {errors.items}
                  </p>
                )}
              </div>
            </div>

            {formData.items.length === 0 ? (
              <div className={`text-center py-8 ${errors.items ? 'text-red-500 bg-red-50 border border-red-200 rounded-lg' : 'text-gray-500'}`}>
                No items in this purchase.
              </div>
            ) : (
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-medium text-gray-900">Item {index + 1}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product (Read-only)
                        </label>
                        <input
                          type="text"
                          value={item.productName}
                          readOnly
                          disabled
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Batch Number
                          <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={item.batchNo || ''}
                          onChange={(e) => updateItem(index, 'batchNo', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="Batch number"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expiry Date
                          <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                        </label>
                        <input
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) => updateItem(index, 'expiryDate', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity
                          <span className="text-xs text-gray-500 ml-1">(Was: {item.originalQuantity})</span>
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          min="1"
                          step="1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Free Qty
                          <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          value={item.freeQuantity}
                          onChange={(e) => updateItem(index, 'freeQuantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Purchase Price
                          <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          value={item.purchasePrice}
                          onChange={(e) => updateItem(index, 'purchasePrice', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          MRP
                          <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          value={item.mrp}
                          onChange={(e) => updateItem(index, 'mrp', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Selling Price
                          <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          value={item.sellingPrice}
                          onChange={(e) => updateItem(index, 'sellingPrice', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          GST Rate (%)
                          <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                        </label>
                        <select
                          value={item.gstRate}
                          onChange={(e) => updateItem(index, 'gstRate', parseFloat(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="0">0%</option>
                          <option value="0.25">0.25%</option>
                          <option value="3">3%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                          <option value="40">40%</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Discount (₹)
                        </label>
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Item Total
                        </label>
                        <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg font-medium">
                          ₹{calculateItemTotal(item).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Charges & Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Additional Charges */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Charges</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Freight Charges (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.freightCharges}
                    onChange={(e) => setFormData({ ...formData, freightCharges: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Packaging Charges (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.packagingCharges}
                    onChange={(e) => setFormData({ ...formData, packagingCharges: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Other Charges (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.otherCharges}
                    onChange={(e) => setFormData({ ...formData, otherCharges: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overall Discount (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Mode
                  </label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CREDIT">Credit</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Status
                  </label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="UNPAID">Unpaid</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>

                {formData.paymentStatus !== 'UNPAID' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount Paid (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.paidAmount}
                      onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-emerald-50 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Total GST:</span>
                <span>₹{totals.totalGST.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Additional Charges:</span>
                <span>₹{((formData.freightCharges || 0) + (formData.packagingCharges || 0) + (formData.otherCharges || 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Discount:</span>
                <span>- ₹{(formData.discount || 0).toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-emerald-200 pt-2 mt-2">
                <div className="flex justify-between text-xl font-bold text-gray-900">
                  <span>Grand Total:</span>
                  <span>₹{totals.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-4">
            <Link
              href={`/dashboard/purchases/${params.id}`}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Purchase'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
