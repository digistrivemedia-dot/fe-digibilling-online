'use client';

import { useToast } from '@/context/ToastContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { purchaseReturnsAPI, purchasesAPI } from '@/utils/api';
import { usePurchaseReturnsStore } from '@/store/usePurchaseReturnsStore';
import { calculatePurchaseTotals } from '@/utils/calculations';
import { HiArrowLeft, HiPlus, HiTrash } from 'react-icons/hi';
import Link from 'next/link';

export default function NewPurchaseReturnPage() {
  const router = useRouter();
  const toast = useToast();
  const { invalidate: invalidatePurchaseReturns } = usePurchaseReturnsStore();
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [formData, setFormData] = useState({
    purchase: '',
    returnDate: new Date().toISOString().split('T')[0],
    items: [],
    reason: 'OTHER',
    notes: ''
  });

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      const data = await purchasesAPI.getAll();
      setPurchases(data);
    } catch (error) {
      console.error('Error loading purchases:', error);
      toast.error(error.message || 'An error occurred');
    }
  };

  const handlePurchaseSelect = async (purchaseId) => {
    if (!purchaseId) {
      setSelectedPurchase(null);
      setFormData({ ...formData, purchase: '', items: [] });
      return;
    }

    try {
      const purchase = await purchasesAPI.getOne(purchaseId);
      setSelectedPurchase(purchase);
      setFormData({ ...formData, purchase: purchaseId, items: [] });
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    }
  };

  const addItemToReturn = (purchaseItem) => {
    const alreadyAdded = formData.items.find(item => item.product === purchaseItem.product._id);
    if (alreadyAdded) {
      toast.warning('Item already added to return list');
      return;
    }

    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          product: purchaseItem.product._id,
          productName: purchaseItem.productName || purchaseItem.product.name,
          batch: purchaseItem.batch,
          batchNo: purchaseItem.batchNo,
          quantity: 1,
          maxQuantity: purchaseItem.quantity,
          price: purchaseItem.purchasePrice || 0,
          gstRate: purchaseItem.gstRate || 0
        }
      ]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItemQuantity = (index, quantity) => {
    const newItems = [...formData.items];
    const maxQty = newItems[index].maxQuantity;

    if (quantity > maxQty) {
      toast.warning(`Maximum returnable quantity is ${maxQty}`);
      return;
    }

    newItems[index] = { ...newItems[index], quantity: parseFloat(quantity) || 0 };
    setFormData({ ...formData, items: newItems });
  };

  const calculateItemTotal = (item) => {
    const taxableAmount = item.quantity * item.price;
    const gstAmount = (taxableAmount * item.gstRate) / 100;
    return taxableAmount + gstAmount;
  };

  const calculateTotals = () => {
    // Use shared calculation utility (matches backend logic)
    // Map items to expected format (using 'price' as 'purchasePrice')
    const items = formData.items.map(item => ({
      quantity: item.quantity,
      purchasePrice: item.price,
      gstRate: item.gstRate,
      cessRate: item.cessRate || 0
    }));

    const result = calculatePurchaseTotals(items, 0, formData.taxType || 'CGST_SGST', 0, {}, null);

    return {
      subtotal: result.subtotal,
      totalGST: result.totalTax,
      totalAmount: result.finalTotal
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.purchase) {
      toast.warning('Please select a purchase');
      return;
    }

    if (formData.items.length === 0) {
      toast.warning('Please add at least one item to return');
      return;
    }

    if (!formData.reason) {
      toast.warning('Please enter reason for return');
      return;
    }

    setLoading(true);

    try {
      const totals = calculateTotals();
      const returnData = {
        originalPurchase: formData.purchase,
        returnDate: formData.returnDate,
        items: formData.items,
        reason: formData.reason,
        reasonDescription: formData.notes
      };

      await purchaseReturnsAPI.create(returnData);
      toast.success('Purchase return created successfully!');
      invalidatePurchaseReturns();
      router.push('/dashboard/purchase-returns');
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchase-returns" className="text-gray-600 hover:text-gray-900">
            <HiArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Purchase Return (Debit Note)</h1>
            <p className="text-gray-500 mt-1">Return products to supplier</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Purchase Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Purchase</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.purchase}
                  onChange={(e) => handlePurchaseSelect(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Purchase</option>
                  {purchases.map((purchase) => (
                    <option key={purchase._id} value={purchase._id}>
                      {purchase.purchaseNumber} - {purchase.supplier?.name} - ₹{purchase.grandTotal}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Return Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.returnDate}
                  onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {selectedPurchase && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Supplier:</span>
                    <div className="font-medium">{selectedPurchase.supplier?.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Purchase Date:</span>
                    <div className="font-medium">
                      {new Date(selectedPurchase.purchaseDate).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Bill Number:</span>
                    <div className="font-medium">{selectedPurchase.supplierInvoiceNo || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Amount:</span>
                    <div className="font-medium">₹{selectedPurchase.grandTotal?.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Available Items */}
          {selectedPurchase && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Items to Return</h2>
              <div className="space-y-2">
                {selectedPurchase.items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.productName || item.product?.name}</div>
                      <div className="text-sm text-gray-500">
                        Batch: {item.batchNo} | Qty: {item.quantity} | Price: ₹{item.purchasePrice}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addItemToReturn(item)}
                      className="ml-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                    >
                      <HiPlus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Return Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Items to Return</h2>

            {formData.items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No items selected for return. Add items from the available items above.
              </div>
            ) : (
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{item.productName}</h3>
                        <p className="text-sm text-gray-500">Batch: {item.batchNo} | Max Qty: {item.maxQuantity}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <HiTrash className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Return Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, e.target.value)}
                          required
                          min="1"
                          max={item.maxQuantity}
                          step="1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Price (₹)</label>
                        <input
                          type="number"
                          value={item.price}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">GST Rate (%)</label>
                        <input
                          type="number"
                          value={item.gstRate}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Item Total</label>
                        <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg font-medium text-lg">
                          ₹{calculateItemTotal(item).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Return Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Return Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Return <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="DAMAGED">Damaged</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="WRONG_ITEM">Wrong Item</option>
                  <option value="QUALITY_ISSUE">Quality Issue</option>
                  <option value="EXCESS_STOCK">Excess Stock</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes / Description
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Any additional details about the return..."
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-red-50 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Return Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Total GST:</span>
                <span>₹{totals.totalGST.toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-red-200 pt-2 mt-2">
                <div className="flex justify-between text-xl font-bold text-gray-900">
                  <span>Total Return Amount:</span>
                  <span>₹{totals.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-4">
            <Link
              href="/dashboard/purchase-returns"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Create Debit Note'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
