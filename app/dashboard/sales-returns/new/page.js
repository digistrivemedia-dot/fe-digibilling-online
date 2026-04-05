'use client';

import { useToast } from '@/context/ToastContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { salesReturnsAPI, invoicesAPI } from '@/utils/api';
import { calculateInvoiceTotals } from '@/utils/calculations';
import { HiArrowLeft, HiPlus, HiTrash } from 'react-icons/hi';
import Link from 'next/link';

export default function NewSalesReturnPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formData, setFormData] = useState({
    originalInvoice: '',
    returnDate: new Date().toISOString().split('T')[0],
    items: [],
    restockItems: true,
    reason: 'OTHER',
    reasonDescription: '',
    refundMethod: 'CASH',
    notes: ''
  });

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const data = await invoicesAPI.getAll();
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error(error.message || 'An error occurred');
    }
  };

  const handleInvoiceSelect = async (invoiceId) => {
    if (!invoiceId) {
      setSelectedInvoice(null);
      setFormData({ ...formData, originalInvoice: '', items: [] });
      return;
    }

    try {
      const invoice = await invoicesAPI.getOne(invoiceId);
      setSelectedInvoice(invoice);
      setFormData({ ...formData, originalInvoice: invoiceId, items: [] });
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    }
  };

  const addItemToReturn = (invoiceItem) => {
    const productId = invoiceItem.product?._id || invoiceItem.product;
    const batchId = invoiceItem.batch?._id || invoiceItem.batch;

    const alreadyAdded = formData.items.find(item =>
      item.product === productId
    );
    if (alreadyAdded) {
      toast.warning('Item already added to return list');
      return;
    }

    const maxReturnableQty = invoiceItem.quantity - (invoiceItem.returnedQuantity || 0);

    if (maxReturnableQty <= 0) {
      toast.warning('This item has already been fully returned');
      return;
    }

    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          product: productId,
          productName: invoiceItem.productName || invoiceItem.product?.name,
          batch: batchId || null,
          batchNo: invoiceItem.batchNo || '',
          quantity: 1,
          maxQuantity: maxReturnableQty,
          price: invoiceItem.sellingPrice || 0,
          discount: invoiceItem.discountAmount || 0,
          gstRate: invoiceItem.gstRate || 0,
          restock: !!batchId
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

  const toggleRestock = (index) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], restock: !newItems[index].restock };
    setFormData({ ...formData, items: newItems });
  };

  const calculateItemTotal = (item) => {
    const taxableAmount = (item.quantity * item.price) - (item.discount || 0);
    const gstAmount = (taxableAmount * item.gstRate) / 100;
    return taxableAmount + gstAmount;
  };

  const calculateTotals = () => {
    // Use shared calculation utility (matches backend logic)
    // Map items to expected format (using 'price' as 'sellingPrice')
    const items = formData.items.map(item => ({
      quantity: item.quantity,
      sellingPrice: item.price,
      gstRate: item.gstRate,
      cessRate: item.cessRate || 0
    }));

    const result = calculateInvoiceTotals(items, 0, formData.taxType || 'CGST_SGST', 0, null);

    return {
      subtotal: result.subtotal,
      totalGST: result.totalTax,
      totalAmount: result.finalTotal
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.originalInvoice) {
      toast.warning('Please select an invoice');
      return;
    }

    if (formData.items.length === 0) {
      toast.warning('Please add at least one item to return');
      return;
    }

    if (!formData.reason) {
      toast.warning('Please select reason for return');
      return;
    }

    setLoading(true);

    try {
      // Prepare items - backend expects batch, product, and quantity
      const returnItems = formData.items.map(item => ({
        product: item.product,
        batch: item.batch,
        quantity: item.quantity,
        productName: item.productName,
        batchNo: item.batchNo
      }));

      const returnData = {
        originalInvoice: formData.originalInvoice,
        items: returnItems,
        reason: formData.reason,
        reasonDescription: formData.reasonDescription || formData.notes,
        refundMethod: formData.refundMethod
      };

      await salesReturnsAPI.create(returnData);
      toast.success('Sales return created successfully!');
      router.push('/dashboard/sales-returns');
    } catch (error) {
      console.error('Sales return error:', error);
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
          <Link href="/dashboard/sales-returns" className="text-gray-600 hover:text-gray-900">
            <HiArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Sales Return (Credit Note)</h1>
            <p className="text-gray-500 mt-1">Process customer product returns</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-black">
          {/* Invoice Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Invoice</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.originalInvoice}
                  onChange={(e) => handleInvoiceSelect(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Invoice</option>
                  {invoices.map((invoice) => (
                    <option key={invoice._id} value={invoice._id}>
                      {invoice.invoiceNumber} - {invoice.customer?.name} - ₹{invoice.grandTotal}
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

            {selectedInvoice && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Customer:</span>
                    <div className="font-medium">{selectedInvoice.customer?.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Invoice Date:</span>
                    <div className="font-medium">
                      {new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Payment Status:</span>
                    <div className="font-medium">{selectedInvoice.paymentStatus}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Amount:</span>
                    <div className="font-medium">₹{selectedInvoice.grandTotal?.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Available Items */}
          {selectedInvoice && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Items to Return</h2>
              <div className="space-y-2">
                {selectedInvoice.items?.map((item, index) => {
                  const returnedQty = item.returnedQuantity || 0;
                  const returnableQty = item.quantity - returnedQty;

                  return (
                    <div key={index} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.productName || item.product?.name}</div>
                        <div className="text-sm text-gray-500">
                          Sold: {item.quantity} | Returned: {returnedQty} | Available: {returnableQty} | Price: ₹{item.sellingPrice}
                        </div>
                      </div>
                      {returnableQty > 0 ? (
                        <button
                          type="button"
                          onClick={() => addItemToReturn(item)}
                          className="ml-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                        >
                          <HiPlus className="w-4 h-4" />
                          Add
                        </button>
                      ) : (
                        <span className="ml-4 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg">Fully Returned</span>
                      )}
                    </div>
                  );
                })}
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
                        <p className="text-sm text-gray-500">Max Returnable Qty: {item.maxQuantity}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <HiTrash className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Discount (₹)</label>
                        <input
                          type="number"
                          value={item.discount}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">GST (%)</label>
                        <input
                          type="number"
                          value={item.gstRate}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Restock?</label>
                        <button
                          type="button"
                          onClick={() => toggleRestock(index)}
                          className={`w-full px-4 py-2 rounded-lg font-medium ${
                            item.restock
                              ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
                              : 'bg-gray-100 text-gray-700 border-2 border-gray-300'
                          }`}
                        >
                          {item.restock ? 'Yes' : 'No'}
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Item Total</label>
                        <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg font-medium">
                          ₹{calculateItemTotal(item).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Return & Refund Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <option value="NOT_NEEDED">Not Needed</option>
                    <option value="SIDE_EFFECTS">Side Effects</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason Description
                  </label>
                  <textarea
                    value={formData.reasonDescription}
                    onChange={(e) => setFormData({ ...formData, reasonDescription: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Provide additional details about the return..."
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Refund Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Refund Method
                  </label>
                  <select
                    value={formData.refundMethod || ''}
                    onChange={(e) => setFormData({ ...formData, refundMethod: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Not Refunded Yet</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="STORE_CREDIT">Store Credit</option>
                  </select>
                </div>
                <p className="text-sm text-gray-500">
                  Note: If refund method is selected, the refund status will be automatically set to COMPLETED.
                </p>
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
              href="/dashboard/sales-returns"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Create Credit Note'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
