'use client';

import { useToast } from '@/context/ToastContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { purchasesAPI } from '@/utils/api';
import { usePurchasesStore } from '@/store/usePurchasesStore';
import { HiPlus, HiSearch, HiEye, HiCurrencyRupee, HiPencil, HiX, HiTrash } from 'react-icons/hi';
import Link from 'next/link';

export default function PurchasesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { items: purchases, stats, loading, fetchItems, invalidate } = usePurchasesStore();
  const [search, setSearch] = useState('');

  // Quick payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    paymentMethod: 'CASH',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    notes: ''
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Delete confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchItems().catch(err => {
        console.error('Error loading purchases:', err);
        toast.error(err.message || 'Failed to load purchases');
      });
    }
  }, [user, authLoading]);

  const filteredPurchases = purchases.filter(purchase =>
    purchase.purchaseNumber?.toLowerCase().includes(search.toLowerCase()) ||
    purchase.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
    purchase.billNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
      case 'UNPAID': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openQuickPaymentModal = (purchase) => {
    setSelectedPurchase(purchase);
    setPaymentFormData({
      amount: purchase.balanceAmount.toString(),
      paymentMethod: 'CASH',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handleQuickPayment = async (e) => {
    e.preventDefault();
    setSubmittingPayment(true);

    try {
      const paymentData = {
        amount: parseFloat(paymentFormData.amount),
        paymentMethod: paymentFormData.paymentMethod,
        paymentDate: paymentFormData.paymentDate,
        referenceNumber: paymentFormData.referenceNumber,
        notes: paymentFormData.notes
      };

      await purchasesAPI.addPayment(selectedPurchase._id, paymentData);
      toast.success('Payment recorded successfully!');
      setShowPaymentModal(false);
      invalidate();
      fetchItems(true).catch(err => console.error('Reload error:', err));
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'An error occurred');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const openDeleteModal = (purchase) => {
    setPurchaseToDelete(purchase);
    setShowDeleteModal(true);
  };

  const handleDeletePurchase = async () => {
    if (!purchaseToDelete) return;

    setDeleting(true);
    try {
      await purchasesAPI.delete(purchaseToDelete._id);
      toast.success('Purchase and associated products deleted successfully!');
      setShowDeleteModal(false);
      setPurchaseToDelete(null);
      invalidate();
      fetchItems(true).catch(err => console.error('Reload error:', err));
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete purchase');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Purchases</h1>
            <p className="text-gray-500 mt-1">Manage your purchase entries</p>
          </div>
          <Link
            href="/dashboard/purchases/new"
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium"
          >
            <HiPlus className="w-5 h-5" />
            Add Purchase
          </Link>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-500">Total Purchases</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalPurchases}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-500">Total Amount</div>
              <div className="text-3xl font-bold text-blue-600 mt-2">
                ₹{stats.totalAmount?.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-500">Pending Payment</div>
              <div className="text-3xl font-bold text-orange-600 mt-2">
                ₹{stats.pendingPayment?.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-500">This Month</div>
              <div className="text-3xl font-bold text-emerald-600 mt-2">
                ₹{stats.thisMonth?.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="relative">
            <HiSearch className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by purchase number, supplier, or bill number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 text-black pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Purchases Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={8} columns={8} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purchase #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        No purchases found. Add your first purchase to get started.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((purchase) => (
                      <tr key={purchase._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{purchase.purchaseNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(purchase.purchaseDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{purchase.supplier?.name}</div>
                          <div className="text-xs text-gray-500">{purchase.supplier?.gstin}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {purchase.supplierInvoiceNo || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {purchase.items?.length} items
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ₹{purchase.grandTotal?.toLocaleString('en-IN')}
                          </div>
                          {purchase.balanceAmount > 0 && (
                            <div className="text-xs text-red-600 font-semibold">
                              Due: ₹{purchase.balanceAmount?.toLocaleString('en-IN')}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusColor(purchase.paymentStatus)}`}>
                            {purchase.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="inline-flex items-center gap-2">
                            {/* Record Payment Button - Fixed width for alignment */}
                            <div className="w-10">
                              {purchase.balanceAmount > 0 && (
                                <button
                                  onClick={() => openQuickPaymentModal(purchase)}
                                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                  title="Record Payment"
                                >
                                  <HiCurrencyRupee className="w-5 h-5" />
                                </button>
                              )}
                            </div>

                            {/* Edit Button - Fixed width for alignment */}
                            <div className="w-10">
                              {!purchase.isReturned && (
                                <button
                                  onClick={() => router.push(`/dashboard/purchases/${purchase._id}/edit`)}
                                  className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit purchase"
                                >
                                  <HiPencil className="w-5 h-5" />
                                </button>
                              )}
                            </div>

                            {/* View Button - Always visible */}
                            <div className="w-10">
                              <button
                                onClick={() => router.push(`/dashboard/purchases/${purchase._id}`)}
                                className="p-2 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="View details"
                              >
                                <HiEye className="w-5 h-5" />
                              </button>
                            </div>

                            {/* Delete Button - Always visible */}
                            <div className="w-10">
                              <button
                                onClick={() => openDeleteModal(purchase)}
                                className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete purchase"
                              >
                                <HiTrash className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && purchaseToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75 backdrop-blur-sm"
              onClick={() => !deleting && setShowDeleteModal(false)}
            />

            <div className="relative z-50 inline-block w-full max-w-md p-0 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">Delete Purchase</h3>
                  <p className="text-sm text-red-100 mt-1">Purchase: {purchaseToDelete.purchaseNumber}</p>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="text-white hover:text-gray-200 disabled:opacity-50"
                >
                  <HiX className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-sm text-red-700">
                      <p className="font-semibold mb-2">Warning: This action cannot be undone!</p>
                      <p>Deleting this purchase will:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Delete the purchase record</li>
                        <li>Delete all associated product batches</li>
                        <li>Update inventory stock levels</li>
                        <li>Remove all ledger entries</li>
                        <li>Update supplier balances</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-700">
                    <p><span className="font-semibold">Supplier:</span> {purchaseToDelete.supplier?.name}</p>
                    <p className="mt-1"><span className="font-semibold">Amount:</span> ₹{purchaseToDelete.grandTotal?.toLocaleString('en-IN')}</p>
                    <p className="mt-1"><span className="font-semibold">Items:</span> {purchaseToDelete.items?.length} items</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mt-4">
                  Are you sure you want to delete this purchase?
                </p>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="px-6 py-2.5 text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeletePurchase}
                  disabled={deleting}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Delete Purchase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Payment Modal */}
      {showPaymentModal && selectedPurchase && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75 backdrop-blur-sm"
              onClick={() => setShowPaymentModal(false)}
            />

            <div className="relative z-50 inline-block w-full max-w-lg p-0 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">Record Payment</h3>
                  <p className="text-sm text-green-100 mt-1">Purchase: {selectedPurchase.purchaseNumber}</p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-white hover:text-gray-200"
                >
                  <HiX className="w-6 h-6" />
                </button>
              </div>

              {/* Pending Balance Banner */}
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 mt-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm">
                    <span className="text-red-700 font-medium">Balance Pending: </span>
                    <span className="text-red-900 font-bold text-lg">₹{selectedPurchase.balanceAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleQuickPayment} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Payment Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    max={selectedPurchase.balanceAmount}
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Max: ₹{selectedPurchase.balanceAmount.toLocaleString('en-IN')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={paymentFormData.paymentMethod}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="CREDIT_NOTE">Credit Note</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentFormData.paymentDate}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={paymentFormData.referenceNumber}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, referenceNumber: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Cheque/Transaction number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Any additional notes..."
                  />
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-6 py-2.5 text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingPayment ? 'Processing...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
