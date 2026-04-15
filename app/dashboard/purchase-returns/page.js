'use client';

import { useToast } from '@/context/ToastContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { usePurchaseReturnsStore } from '@/store/usePurchaseReturnsStore';
import { HiPlus, HiSearch, HiEye } from 'react-icons/hi';
import Link from 'next/link';

export default function PurchaseReturnsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { items: purchaseReturns, stats, loading, fetchItems } = usePurchaseReturnsStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchItems().catch(err => {
        console.error('Error loading purchase returns:', err);
        toast.error(err.message || 'Failed to load purchase returns');
      });
    }
  }, [user, authLoading]);

  const filteredReturns = purchaseReturns.filter(ret =>
    ret.debitNoteNumber?.toLowerCase().includes(search.toLowerCase()) ||
    ret.purchase?.purchaseNumber?.toLowerCase().includes(search.toLowerCase()) ||
    ret.supplier?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Purchase Returns (Debit Notes)</h1>
            <p className="text-gray-500 mt-1">Manage product returns to suppliers</p>
          </div>
          <Link
            href="/dashboard/purchase-returns/new"
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium"
          >
            <HiPlus className="w-5 h-5" />
            New Return
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">Total Returns</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {loading ? (
                <span className="text-gray-400 animate-pulse">...</span>
              ) : (
                stats?.totalReturns || 0
              )}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">Total Amount</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">
              {loading ? (
                <span className="text-gray-400 animate-pulse">...</span>
              ) : (
                `₹${stats?.totalAmount?.toLocaleString('en-IN') || '0'}`
              )}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">This Month</div>
            <div className="text-3xl font-bold text-emerald-600 mt-2">
              {loading ? (
                <span className="text-gray-400 animate-pulse">...</span>
              ) : (
                `₹${stats?.thisMonth?.toLocaleString('en-IN') || '0'}`
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="relative">
            <HiSearch className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by debit note number, purchase number, or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Returns Table */}
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
                    Debit Note #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      No purchase returns found.
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((ret) => (
                    <tr key={ret._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{ret.debitNoteNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(ret.returnDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ret.purchase?.purchaseNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{ret.supplier?.name}</div>
                        <div className="text-xs text-gray-500">{ret.supplier?.gstin}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ret.items?.length} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ₹{ret.totalAmount?.toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">{ret.reason}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => router.push(`/dashboard/purchase-returns/${ret._id}`)}
                          className="text-emerald-600 hover:text-emerald-900"
                        >
                          <HiEye className="w-5 h-5" />
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
