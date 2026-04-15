'use client';

import { useToast } from '@/context/ToastContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { expensesAPI } from '@/utils/api';
import { useExpensesStore } from '@/store/useExpensesStore';
import { HiPlus, HiSearch, HiPencil, HiTrash } from 'react-icons/hi';
import Link from 'next/link';

export default function ExpensesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { items: expenses, stats, loading, fetchItems, invalidate } = useExpensesStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = [
    'ALL', 'RENT', 'SALARY', 'ELECTRICITY', 'WATER', 'TELEPHONE', 'INTERNET',
    'OFFICE_SUPPLIES', 'MAINTENANCE', 'INSURANCE', 'TRANSPORT', 'MARKETING',
    'PROFESSIONAL_FEES', 'BANK_CHARGES', 'DEPRECIATION', 'TAXES', 'REPAIR',
    'MISCELLANEOUS', 'OTHER'
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchItems().catch(err => {
        console.error('Error loading expenses:', err);
        toast.error(err.message || 'An error occurred');
      });
    }
  }, [user, authLoading]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      await expensesAPI.delete(id);
      toast.success('Expense deleted successfully!');
      invalidate();
      fetchItems(true).catch(err => console.error('Error reloading expenses:', err));
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    }
  };

  if (authLoading || !user) return null;

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch =
      expense.description?.toLowerCase().includes(search.toLowerCase()) ||
      expense.vendor?.toLowerCase().includes(search.toLowerCase()) ||
      expense.category?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || expense.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (category) => {
    return category.split('_').map(word =>
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
            <p className="text-gray-500 mt-1">Track and manage your business expenses</p>
          </div>
          <Link
            href="/dashboard/expenses/new"
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium"
          >
            <HiPlus className="w-5 h-5" />
            Add Expense
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">Total Expenses</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {loading ? (
                <span className="text-gray-400 animate-pulse">...</span>
              ) : (
                stats?.totalCount || 0
              )}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">Total Amount</div>
            <div className="text-3xl font-bold text-red-600 mt-2">
              {loading ? (
                <span className="text-gray-400 animate-pulse">...</span>
              ) : (
                `₹${stats?.totalAmount?.toLocaleString('en-IN') || '0'}`
              )}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">This Month</div>
            <div className="text-3xl font-bold text-orange-600 mt-2">
              {loading ? (
                <span className="text-gray-400 animate-pulse">...</span>
              ) : (
                `₹${stats?.thisMonth?.toLocaleString('en-IN') || '0'}`
              )}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">This Year</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">
              {loading ? (
                <span className="text-gray-400 animate-pulse">...</span>
              ) : (
                `₹${stats?.thisYear?.toLocaleString('en-IN') || '0'}`
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <HiSearch className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by description, vendor, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'ALL' ? 'All Categories' : getCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={8} columns={7} />
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Mode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No expenses found. Add your first expense to get started.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(expense.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {getCategoryLabel(expense.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{expense.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {expense.vendor || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {expense.paymentMode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ₹{expense.totalAmount?.toLocaleString('en-IN')}
                        </div>
                        {expense.gstAmount > 0 && (
                          <div className="text-xs text-gray-500">
                            (incl. GST ₹{expense.gstAmount?.toLocaleString('en-IN')})
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => router.push(`/dashboard/expenses/${expense._id}`)}
                          className="text-emerald-600 hover:text-emerald-900 mr-4"
                        >
                          <HiPencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <HiTrash className="w-5 h-5" />
                        </button>
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
    </DashboardLayout>
  );
}
