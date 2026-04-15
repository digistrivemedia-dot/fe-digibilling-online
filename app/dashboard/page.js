'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { useDashboardStore } from '@/store/useDashboardStore';
import Link from 'next/link';
import {
  HiCurrencyRupee,
  HiClock,
  HiDocumentText,
  HiTrendingUp,
  HiDocumentAdd,
  HiCube,
  HiUsers,
  HiCog,
  HiArrowRight,
  HiCheckCircle,
  HiShoppingCart,
  HiTruck,
  HiViewGrid,
  HiExclamationCircle,
  HiReceiptRefund
} from 'react-icons/hi';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { stats, loading: loadingStats, fetchStats } = useDashboardStore();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  if (loading || !user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome header */}
        <div className="relative bg-emerald-600 rounded-3xl p-8 text-white overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2 flex items-center">
                  Welcome back, {user.name}!
                  <span className="ml-3 animate-bounce">👋</span>
                </h1>
                <p className="text-emerald-100 text-lg">Here&apos;s what&apos;s happening with your store today 😊.</p>
              </div>
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <HiCheckCircle className="w-5 h-5 text-green-300" />
                <span className="text-sm font-medium">All systems operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
            <div className="h-1 flex-1 ml-6 bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 rounded-full"></div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            <Link
              href="/dashboard/invoices/new"
              className="group relative flex flex-col items-center justify-center p-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl hover:from-emerald-100 hover:to-green-100 transition-all duration-300 border-2 border-transparent hover:border-emerald-200 overflow-hidden"
            >
              <div className="relative z-10 p-3 bg-emerald-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 mb-3">
                <HiDocumentAdd className="w-6 h-6 text-white" />
              </div>
              <span className="relative z-10 text-xs font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors text-center">New Invoice</span>
            </Link>

            <Link
              href="/dashboard/purchases/new"
              className="group relative flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl hover:from-purple-100 hover:to-pink-100 transition-all duration-300 border-2 border-transparent hover:border-purple-200 overflow-hidden"
            >
              <div className="relative z-10 p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 mb-3">
                <HiShoppingCart className="w-6 h-6 text-white" />
              </div>
              <span className="relative z-10 text-xs font-semibold text-gray-900 group-hover:text-purple-700 transition-colors text-center">New Purchase</span>
            </Link>

            <Link
              href="/dashboard/expenses/new"
              className="group relative flex flex-col items-center justify-center p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl hover:from-red-100 hover:to-orange-100 transition-all duration-300 border-2 border-transparent hover:border-red-200 overflow-hidden"
            >
              <div className="relative z-10 p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 mb-3">
                <HiCurrencyRupee className="w-6 h-6 text-white" />
              </div>
              <span className="relative z-10 text-xs font-semibold text-gray-900 group-hover:text-red-700 transition-colors text-center">Add Expense</span>
            </Link>

            <Link
              href="/dashboard/sales-returns/new"
              className="group relative flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 border-2 border-transparent hover:border-blue-200 overflow-hidden"
            >
              <div className="relative z-10 p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 mb-3">
                <HiReceiptRefund className="w-6 h-6 text-white" />
              </div>
              <span className="relative z-10 text-xs font-semibold text-gray-900 group-hover:text-blue-700 transition-colors text-center">Sales Return</span>
            </Link>

            <Link
              href="/dashboard/inventory"
              className="group relative flex flex-col items-center justify-center p-6 bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl hover:from-cyan-100 hover:to-teal-100 transition-all duration-300 border-2 border-transparent hover:border-cyan-200 overflow-hidden"
            >
              <div className="relative z-10 p-3 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 mb-3">
                <HiViewGrid className="w-6 h-6 text-white" />
              </div>
              <span className="relative z-10 text-xs font-semibold text-gray-900 group-hover:text-cyan-700 transition-colors text-center">Inventory</span>
            </Link>

            <Link
              href="/dashboard/suppliers"
              className="group relative flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl hover:from-amber-100 hover:to-yellow-100 transition-all duration-300 border-2 border-transparent hover:border-amber-200 overflow-hidden"
            >
              <div className="relative z-10 p-3 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 mb-3">
                <HiTruck className="w-6 h-6 text-white" />
              </div>
              <span className="relative z-10 text-xs font-semibold text-gray-900 group-hover:text-amber-700 transition-colors text-center">Suppliers</span>
            </Link>
          </div>
        </div>

        {/* Stats cards - Row 1: Sales & Revenue */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Sales & Revenue</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Today's Sales */}
            <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg shadow-green-500/50">
                    <HiCurrencyRupee className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex items-center text-green-600 text-sm font-semibold bg-green-100 px-3 py-1 rounded-full">
                    <HiTrendingUp className="w-4 h-4 mr-1" />
                    Today
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Today&apos;s Sales</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loadingStats ? (
                    <span className="text-gray-400 animate-pulse">...</span>
                  ) : (
                    `₹${stats?.invoices?.todaySales?.toLocaleString('en-IN') || '0'}`
                  )}
                </p>
              </div>
            </div>

            {/* Outstanding Amount */}
            <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-red-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg shadow-orange-500/50">
                    <HiClock className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex items-center text-orange-600 text-sm font-semibold bg-orange-100 px-3 py-1 rounded-full">
                    Pending
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Outstanding</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loadingStats ? (
                    <span className="text-gray-400 animate-pulse">...</span>
                  ) : (
                    `₹${stats?.invoices?.totalOutstanding?.toLocaleString('en-IN') || '0'}`
                  )}
                </p>
              </div>
            </div>

            {/* Total Invoices */}
            <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/50">
                    <HiDocumentText className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex items-center text-blue-600 text-sm font-semibold bg-blue-100 px-3 py-1 rounded-full">
                    Total
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Invoices</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loadingStats ? (
                    <span className="text-gray-400 animate-pulse">...</span>
                  ) : (
                    stats?.invoices?.totalInvoices?.toLocaleString('en-IN') || '0'
                  )}
                </p>
              </div>
            </div>

            {/* Monthly Revenue */}
            <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/50">
                    <HiTrendingUp className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex items-center text-emerald-600 text-sm font-semibold bg-emerald-100 px-3 py-1 rounded-full">
                    This Month
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Monthly Revenue</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loadingStats ? (
                    <span className="text-gray-400 animate-pulse">...</span>
                  ) : (
                    `₹${stats?.invoices?.monthlyRevenue?.toLocaleString('en-IN') || '0'}`
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats cards - Row 2: Purchases & Inventory */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Purchases & Inventory</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Purchases */}
            <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg shadow-purple-500/50">
                    <HiShoppingCart className="w-7 h-7 text-white" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Purchases (Month)</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loadingStats ? (
                    <span className="text-gray-400 animate-pulse">...</span>
                  ) : (
                    `₹${stats?.purchases?.thisMonth?.toLocaleString('en-IN') || '0'}`
                  )}
                </p>
              </div>
            </div>

            {/* Suppliers Payable */}
            <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl shadow-lg shadow-red-500/50">
                    <HiTruck className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex items-center text-red-600 text-sm font-semibold bg-red-100 px-3 py-1 rounded-full">
                    Payable
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Suppliers Payable</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loadingStats ? (
                    <span className="text-gray-400 animate-pulse">...</span>
                  ) : (
                    `₹${stats?.suppliers?.totalPayable?.toLocaleString('en-IN') || '0'}`
                  )}
                </p>
              </div>
            </div>

            {/* Inventory Value */}
            <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg shadow-blue-500/50">
                    <HiViewGrid className="w-7 h-7 text-white" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Inventory Value</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loadingStats ? (
                    <span className="text-gray-400 animate-pulse">...</span>
                  ) : (
                    `₹${stats?.inventory?.totalValue?.toLocaleString('en-IN') || '0'}`
                  )}
                </p>
              </div>
            </div>

            {/* Low Stock & Alerts */}
            <Link href="/dashboard/inventory" className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-yellow-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl shadow-lg shadow-amber-500/50">
                    <HiExclamationCircle className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex items-center text-amber-600 text-sm font-semibold bg-amber-100 px-3 py-1 rounded-full">
                    Alerts
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">Stock Alerts</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loadingStats ? (
                    <span className="text-gray-400 animate-pulse">...</span>
                  ) : (
                    ((stats?.inventory?.lowStockCount || 0) + (stats?.inventory?.nearExpiryCount || 0) + (stats?.inventory?.expiredCount || 0)) || '0'
                  )}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
