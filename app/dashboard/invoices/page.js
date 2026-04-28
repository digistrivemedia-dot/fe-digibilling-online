'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import LoadingSpinner from '@/components/LoadingSpinner';
import { invoicesAPI, customersAPI } from '@/utils/api';
import { useInvoicesStore } from '@/store/useInvoicesStore';
import { useProductsStore } from '@/store/useProductsStore';
import Link from 'next/link';
import { HiEye, HiPencil, HiTrash, HiCurrencyRupee, HiX, HiSearch, HiFilter, HiChevronLeft, HiChevronRight, HiChevronDown, HiChevronUp } from 'react-icons/hi';

export default function Invoices() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { items: invoices, pagination, loading: loadingInvoices, fetchItems: fetchInvoices, invalidate: invalidateInvoices } = useInvoicesStore();
  const { invalidate: invalidateProducts } = useProductsStore();
  const [customers, setCustomers] = useState([]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Search and filter state
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState(''); // Separate input state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    paymentStatus: '',
    customer: '',
    invoiceType: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: ''
  });

  // Sorting state
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Quick payment modal state
  const [showQuickPaymentModal, setShowQuickPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      loadInvoices();
      loadCustomers();
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadInvoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, filters.paymentStatus, filters.customer, filters.invoiceType, filters.startDate, filters.endDate, filters.minAmount, filters.maxAmount, sortBy, sortOrder]);

  const loadCustomers = async () => {
    try {
      const data = await customersAPI.getAll();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadInvoices = async () => {
    const params = {
      page,
      limit,
      sortBy,
      sortOrder,
      ...(search && { search }),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      )
    };
    try {
      await fetchInvoices(params);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    }
  };

  const handleDelete = async (invoiceId, invoiceNumber) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      await invoicesAPI.delete(invoiceId);
      toast.success('Invoice deleted successfully');
      invalidateInvoices();
      invalidateProducts(); // stock restored on delete
      loadInvoices();
    } catch (error) {
      toast.error(error.message || 'Failed to delete invoice');
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearFilters = () => {
    setFilters({
      paymentStatus: '',
      customer: '',
      invoiceType: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: ''
    });
    setSearch('');
    setSearchInput('');
    setPage(1);
  };

  const openQuickPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.balanceAmount || 0);
    setPaymentMethod('CASH');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReferenceNumber('');
    setPaymentNotes('');
    setShowQuickPaymentModal(true);
  };

  const handleQuickPaymentSubmit = async (e) => {
    e.preventDefault();

    if (!selectedInvoice) return;
    if (paymentAmount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    try {
      const paymentData = {
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        date: paymentDate,
        referenceNumber,
        notes: paymentNotes
      };

      await invoicesAPI.addPayment(selectedInvoice._id, paymentData);
      toast.success('Payment recorded successfully');
      setShowQuickPaymentModal(false);
      invalidateInvoices();
      loadInvoices();
    } catch (error) {
      toast.error(error.message || 'Failed to record payment');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <HiChevronDown className="w-4 h-4 text-gray-400" />;
    return sortOrder === 'asc' ?
      <HiChevronUp className="w-4 h-4 text-blue-600" /> :
      <HiChevronDown className="w-4 h-4 text-blue-600" />;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600 mt-1">Manage all your invoices</p>
          </div>
          <Link
            href="/dashboard/invoices/new"
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            + New Invoice
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <HiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by invoice number, customer name, or phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-full text-gray-800 pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <HiSearch className="w-5 h-5" />
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                showFilters
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <HiFilter className="w-5 h-5" />
              Filters
              {Object.values(filters).some(v => v !== '') && (
                <span className="ml-1 px-2 py-0.5 bg-white text-blue-600 rounded-full text-xs">
                  {Object.values(filters).filter(v => v !== '').length}
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Payment Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                  <select
                    value={filters.paymentStatus}
                    onChange={(e) => {
                      setFilters({ ...filters, paymentStatus: e.target.value });
                      setPage(1);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="PAID">Paid</option>
                    <option value="UNPAID">Unpaid</option>
                    <option value="PARTIAL">Partial</option>
                  </select>
                </div>

                {/* Customer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                  <select
                    value={filters.customer}
                    onChange={(e) => {
                      setFilters({ ...filters, customer: e.target.value });
                      setPage(1);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Customers</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Invoice Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Type</label>
                  <select
                    value={filters.invoiceType}
                    onChange={(e) => {
                      setFilters({ ...filters, invoiceType: e.target.value });
                      setPage(1);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="tax-invoice">Tax Invoice</option>
                    <option value="bill-of-supply">Bill of Supply</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => {
                      setFilters({ ...filters, startDate: e.target.value });
                      setPage(1);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => {
                      setFilters({ ...filters, endDate: e.target.value });
                      setPage(1);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Min Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
                  <input
                    type="number"
                    placeholder="₹ 0"
                    value={filters.minAmount}
                    onChange={(e) => {
                      setFilters({ ...filters, minAmount: e.target.value });
                      setPage(1);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Max Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
                  <input
                    type="number"
                    placeholder="₹ 999999"
                    value={filters.maxAmount}
                    onChange={(e) => {
                      setFilters({ ...filters, maxAmount: e.target.value });
                      setPage(1);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              {(search || Object.values(filters).some(v => v !== '')) && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Summary and Page Size */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {invoices.length > 0 ? ((page - 1) * limit + 1) : 0} to {Math.min(page * limit, pagination.total || 0)} of {pagination.total || 0} invoices
          </p>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Show:</label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loadingInvoices ? (
            <TableSkeleton rows={limit} cols={7} />
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No invoices found</p>
              {(search || Object.values(filters).some(v => v !== '')) && (
                <button
                  onClick={handleClearFilters}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('invoiceNumber')}
                    >
                      <div className="flex items-center gap-2">
                        Invoice #
                        <SortIcon field="invoiceNumber" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('customerName')}
                    >
                      <div className="flex items-center gap-2">
                        Customer
                        <SortIcon field="customerName" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('invoiceDate')}
                    >
                      <div className="flex items-center gap-2">
                        Date
                        <SortIcon field="invoiceDate" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('grandTotal')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Amount
                        <SortIcon field="grandTotal" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/dashboard/invoices/${invoice._id}`} className="text-blue-600 hover:text-blue-800 font-semibold">
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900 max-w-[200px] xl:max-w-[300px] whitespace-normal break-all">{invoice.customerName}</div>
                          {invoice.customerPhone && (
                            <div className="text-sm text-gray-500">{invoice.customerPhone}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
                        ₹{invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          invoice.paymentStatus === 'PAID'
                            ? 'bg-green-100 text-green-800'
                            : invoice.paymentStatus === 'PARTIAL'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {invoice.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {invoice.balanceAmount > 0 ? (
                          <span className="text-red-600 font-semibold">
                            ₹{invoice.balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-green-600 font-semibold">Paid</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/invoices/${invoice._id}`}
                            className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <HiEye className="w-5 h-5" />
                          </Link>
                          {invoice.balanceAmount > 0 && (
                            <button
                              onClick={() => openQuickPaymentModal(invoice)}
                              className="text-green-600 hover:text-green-800 p-2 hover:bg-green-50 rounded-lg transition-colors"
                              title="Record Payment"
                            >
                              <HiCurrencyRupee className="w-5 h-5" />
                            </button>
                          )}
                          <Link
                            href={`/dashboard/invoices/${invoice._id}/edit`}
                            className="text-yellow-600 hover:text-yellow-800 p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <HiPencil className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(invoice._id, invoice.invoiceNumber)}
                            className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <HiTrash className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination - Matching inventory/products design */}
        {invoices.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Info text */}
              <p className="text-sm text-gray-600">
                {pagination.total === 0
                  ? 'No entries found'
                  : `Showing ${((page - 1) * limit) + 1}–${Math.min(page * limit, pagination.total || 0)} of ${pagination.total || 0} entries`}
              </p>

              {/* Page buttons */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={!pagination.hasPrevPage}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-600 transition-colors"
                  >
                    <HiChevronLeft className="w-4 h-4" />
                  </button>

                  {(() => {
                    const totalPages = pagination.totalPages;
                    const safePage = Math.min(page, totalPages);
                    const delta = 2;
                    const pageNumbers = [];

                    for (let i = 1; i <= totalPages; i++) {
                      if (i === 1 || i === totalPages || (i >= safePage - delta && i <= safePage + delta)) {
                        pageNumbers.push(i);
                      } else if (pageNumbers[pageNumbers.length - 1] !== '...') {
                        pageNumbers.push('...');
                      }
                    }

                    return pageNumbers.map((p, idx) =>
                      p === '...'
                        ? <span key={`el-${idx}`} className="px-2 text-gray-400 select-none">…</span>
                        : (
                          <button
                            key={p}
                            onClick={() => handlePageChange(p)}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors border ${safePage === p
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            {p}
                          </button>
                        )
                    );
                  })()}

                  <button
                    onClick={() => handlePageChange(Math.min(pagination.totalPages, page + 1))}
                    disabled={!pagination.hasNextPage}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-600 transition-colors"
                  >
                    <HiChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Payment Modal */}
      {showQuickPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Record Payment</h3>
              <button
                onClick={() => setShowQuickPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">Invoice: <span className="font-semibold text-gray-900">{selectedInvoice.invoiceNumber}</span></p>
              <p className="text-sm text-gray-600 mt-1">Customer: <span className="font-semibold text-gray-900">{selectedInvoice.customerName}</span></p>
              <p className="text-sm text-gray-600 mt-1">Balance: <span className="font-semibold text-red-600">₹{selectedInvoice.balanceAmount.toFixed(2)}</span></p>
            </div>

            <form onSubmit={handleQuickPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date *</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Transaction ID, Cheque No., etc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows="3"
                  placeholder="Add payment notes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowQuickPaymentModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
