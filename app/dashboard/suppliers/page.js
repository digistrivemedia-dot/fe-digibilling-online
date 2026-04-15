'use client';

import { useToast } from '@/context/ToastContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { suppliersAPI } from '@/utils/api';
import { useSuppliersStore } from '@/store/useSuppliersStore';
import { HiPlus, HiSearch, HiPencil, HiTrash } from 'react-icons/hi';
import Link from 'next/link';

export default function SuppliersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { items: suppliers, stats, loading, fetchItems, invalidate } = useSuppliersStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchItems().catch(err => {
        console.error('Error loading suppliers:', err);
        toast.error(err.message || 'Failed to load suppliers');
      });
    }
  }, [user, authLoading]);

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(search.toLowerCase()) ||
    supplier.gstin?.toLowerCase().includes(search.toLowerCase()) ||
    supplier.phone?.includes(search)
  );

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
      await suppliersAPI.delete(id);
      toast.success('Supplier deleted successfully');
      invalidate();
      fetchItems(true).catch(err => console.error('Reload error:', err));
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Suppliers</h1>
            <p className="text-gray-500 mt-1">Manage your supplier database</p>
          </div>
          <Link
            href="/dashboard/suppliers/new"
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium"
          >
            <HiPlus className="w-5 h-5" />
            Add Supplier
          </Link>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-500">Total Suppliers</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalSuppliers}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-500">Active Suppliers</div>
              <div className="text-3xl font-bold text-emerald-600 mt-2">{stats.activeSuppliers}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-500">Total Payable</div>
              <div className="text-3xl font-bold text-orange-600 mt-2">
                ₹{stats.totalPayable.toLocaleString('en-IN')}
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
              placeholder="Search by name, GSTIN, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
          </div>
        </div>

        {/* Suppliers Table */}
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
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GSTIN
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        No suppliers found. Add your first supplier to get started.
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((supplier) => (
                      <tr key={supplier._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{supplier.name}</div>
                          {supplier.contactPerson && (
                            <div className="text-sm text-gray-500">Contact: {supplier.contactPerson}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {supplier.gstin}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{supplier.phone}</div>
                          {supplier.email && (
                            <div className="text-sm text-gray-500">{supplier.email}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{supplier.city}</div>
                          <div className="text-sm text-gray-500">{supplier.state}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${supplier.currentBalance > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                            ₹{supplier.currentBalance.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${supplier.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {supplier.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => router.push(`/dashboard/suppliers/${supplier._id}`)}
                            className="text-emerald-600 hover:text-emerald-900 mr-4"
                          >
                            <HiPencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(supplier._id)}
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
