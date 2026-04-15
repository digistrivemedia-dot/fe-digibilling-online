'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { invoicesAPI } from '@/utils/api';
import { usePaymentReceiptsStore } from '@/store/usePaymentReceiptsStore';
import {
  HiSearch,
  HiEye,
  HiTrash,
  HiChevronLeft,
  HiChevronRight,
} from 'react-icons/hi';

const PAGE_SIZE = 10;

const METHOD_LABEL = {
  CASH: 'Cash', UPI: 'UPI', CARD: 'Card', CHEQUE: 'Cheque',
  BANK_TRANSFER: 'Bank Transfer', CREDIT_NOTE: 'Credit Note', OTHER: 'Other',
};

const METHOD_COLOR = {
  CASH: 'bg-green-100 text-green-800',
  UPI: 'bg-blue-100 text-blue-800',
  BANK_TRANSFER: 'bg-purple-100 text-purple-800',
  CHEQUE: 'bg-orange-100 text-orange-800',
  CARD: 'bg-pink-100 text-pink-800',
  CREDIT_NOTE: 'bg-yellow-100 text-yellow-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

const STATUS_COLOR = {
  PAID: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-yellow-100 text-yellow-800',
  UNPAID: 'bg-red-100 text-red-800',
};

export default function PaymentReceiptsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const { items: invoices, loading: loadingData, fetchItems, invalidate } = usePaymentReceiptsStore();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchItems();
    }
  }, [user, loading]);

  // Stats computed from data
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const now = new Date();
  const thisMonth = invoices
    .filter(inv => {
      const d = new Date(inv.invoiceDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

  // Filter
  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    return (
      (inv.invoiceNumber || '').toLowerCase().includes(q) ||
      (inv.customerName || '').toLowerCase().includes(q) ||
      (inv.customerPhone || '').toLowerCase().includes(q) ||
      (inv.paymentMethod || '').toLowerCase().includes(q)
    );
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await invoicesAPI.delete(deleteConfirm._id);
      toast.success('Invoice deleted successfully');
      setDeleteConfirm(null);
      invalidate();
      fetchItems(true);
    } catch (error) {
      toast.error(error.message || 'Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Receipts</h1>
          <p className="text-gray-500 mt-1">All payments received against invoices</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total Receipts</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {loadingData ? <span className="animate-pulse text-gray-300">...</span> : invoices.length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total Amount Received</p>
            <p className="text-3xl font-bold text-emerald-600 mt-2">
              {loadingData
                ? <span className="animate-pulse text-gray-300">...</span>
                : `₹${totalAmount.toLocaleString('en-IN')}`}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">This Month</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {loadingData
                ? <span className="animate-pulse text-gray-300">...</span>
                : `₹${thisMonth.toLocaleString('en-IN')}`}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="relative">
            <HiSearch className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by invoice number, customer or payment method..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-black"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loadingData ? (
            <div className="p-4">
              <TableSkeleton rows={8} columns={7} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-16 text-center text-gray-400">
                        {search ? 'No results match your search.' : 'No payment receipts found.'}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((inv, idx) => (
                      <tr key={inv._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(safePage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">{inv.invoiceNumber}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{inv.customerName}</div>
                          {inv.customerPhone && (
                            <div className="text-xs text-gray-500">{inv.customerPhone}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          ₹{(inv.grandTotal || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-emerald-700">
                            ₹{(inv.paidAmount || 0).toLocaleString('en-IN')}
                          </span>
                          {inv.balanceAmount > 0 && (
                            <div className="text-xs text-red-500 mt-0.5">
                              Bal: ₹{inv.balanceAmount.toLocaleString('en-IN')}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${METHOD_COLOR[inv.paymentMethod] || 'bg-gray-100 text-gray-800'}`}>
                            {METHOD_LABEL[inv.paymentMethod] || inv.paymentMethod || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLOR[inv.paymentStatus] || 'bg-gray-100 text-gray-800'}`}>
                            {inv.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => router.push(`/dashboard/invoices/${inv._id}`)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="View Invoice"
                            >
                              <HiEye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(inv)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Invoice"
                            >
                              <HiTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loadingData && filtered.length > PAGE_SIZE && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <p className="text-sm text-gray-600">
                Showing{' '}
                <span className="font-medium">{(safePage - 1) * PAGE_SIZE + 1}</span>
                {' '}–{' '}
                <span className="font-medium">{Math.min(safePage * PAGE_SIZE, filtered.length)}</span>
                {' '}of{' '}
                <span className="font-medium">{filtered.length}</span> receipts
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <HiChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === '...' ? (
                      <span key={`dots-${i}`} className="px-2 py-1 text-gray-400 text-sm">...</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          safePage === item
                            ? 'bg-emerald-600 text-white'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <HiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <HiTrash className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Invoice?</h3>
            <p className="text-sm text-gray-500 mb-2">
              Invoice <span className="font-semibold text-gray-800">{deleteConfirm.invoiceNumber}</span> and its payment record will be permanently deleted.
            </p>
            <p className="text-xs text-red-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
