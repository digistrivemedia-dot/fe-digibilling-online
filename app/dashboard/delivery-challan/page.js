'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { deliveryChallansAPI } from '@/utils/api';
import { useDeliveryChallansStore } from '@/store/useDeliveryChallansStore';
import Link from 'next/link';
import {
    HiPlus, HiEye, HiPencil, HiTrash, HiSearch,
    HiChevronLeft, HiChevronRight, HiTruck, HiDocumentText,
} from 'react-icons/hi';

const PAGE_SIZE = 10;

const STATUS_COLOR = {
    DRAFT: 'bg-gray-100 text-gray-700',
    DISPATCHED: 'bg-blue-100 text-blue-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
};

export default function DeliveryChallansPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const toast = useToast();

    const { items: challans, loading: loadingData, fetchItems, invalidate } = useDeliveryChallansStore();
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Convert to Invoice state
    const [convertConfirm, setConvertConfirm] = useState(null);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
        else if (user) fetchItems();
    }, [user, loading]);

    // Reload data when tab becomes visible — respects cache TTL
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && user) fetchItems();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [user]);

    const filtered = challans.filter(c => {
        const s = search.toLowerCase();
        return (
            (c.challanNumber || '').toLowerCase().includes(s) ||
            (c.customerName || '').toLowerCase().includes(s) ||
            (c.status || '').toLowerCase().includes(s)
        );
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deliveryChallansAPI.delete(deleteConfirm._id);
            toast.success('Delivery challan deleted');
            setDeleteConfirm(null);
            invalidate();
            fetchItems(true);
        } catch (error) {
            toast.error(error.message || 'Failed to delete');
        } finally {
            setDeleting(false);
        }
    };

    const handleConvertToInvoice = () => {
        // Redirect to invoice creation page with challan data
        router.push(`/dashboard/invoices/new?fromChallan=${convertConfirm._id}`);
        setConvertConfirm(null);
    };

    if (loading || !user) return null;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Delivery Challans</h1>
                        <p className="text-sm text-gray-500 mt-1">Create and manage delivery challans for dispatches</p>
                    </div>
                    <Link
                        href="/dashboard/delivery-challan/new"
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                    >
                        <HiPlus className="w-5 h-5" />
                        New Delivery Challan
                    </Link>
                </div>

                {/* Search */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="relative">
                        <HiSearch className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by challan number, customer or status..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {loadingData ? (
                        <div className="p-4"><TableSkeleton rows={8} columns={7} /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Challan #</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle No</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paginated.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-16 text-center">
                                                <HiTruck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-400">
                                                    {search ? 'No results match your search.' : 'No delivery challans yet. Create your first one!'}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginated.map((c) => (
                                            <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{c.challanNumber}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                    {new Date(c.challanDate).toLocaleDateString('en-IN')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{c.customerName}</div>
                                                    {c.customerPhone && <div className="text-xs text-gray-500">{c.customerPhone}</div>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.vehicleNumber || '—'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{(c.items || []).length} item(s)</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[c.status] || STATUS_COLOR.DRAFT}`}>
                                                        {c.status || 'DRAFT'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {/* Convert to Invoice button */}
                                                        {!c.convertedToInvoiceId ? (
                                                            <button
                                                                onClick={() => setConvertConfirm(c)}
                                                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors text-xs font-semibold"
                                                                title="Convert to Invoice"
                                                            >
                                                                <HiDocumentText className="w-3.5 h-3.5" />
                                                                Invoice
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => router.push(`/dashboard/invoices/${c.convertedToInvoiceId}`)}
                                                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors text-xs font-semibold"
                                                                title="View converted invoice"
                                                            >
                                                                <HiDocumentText className="w-3.5 h-3.5" />
                                                                View Invoice
                                                            </button>
                                                        )}

                                                        <button onClick={() => router.push(`/dashboard/delivery-challan/${c._id}`)}
                                                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View">
                                                            <HiEye className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => router.push(`/dashboard/delivery-challan/${c._id}/edit`)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                                            <HiPencil className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setDeleteConfirm(c)}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
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

                    {!loadingData && filtered.length > PAGE_SIZE && (
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                            <p className="text-sm text-gray-600">
                                Showing <span className="font-medium">{(safePage - 1) * PAGE_SIZE + 1}</span>–
                                <span className="font-medium">{Math.min(safePage * PAGE_SIZE, filtered.length)}</span> of{' '}
                                <span className="font-medium">{filtered.length}</span>
                            </p>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed">
                                    <HiChevronLeft className="w-4 h-4" />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                                    .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i - 1] > 1) acc.push('...'); acc.push(p); return acc; }, [])
                                    .map((item, i) => item === '...'
                                        ? <span key={`d${i}`} className="px-2 text-gray-400 text-sm">...</span>
                                        : <button key={item} onClick={() => setCurrentPage(item)}
                                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${safePage === item ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>
                                            {item}
                                        </button>
                                    )}
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed">
                                    <HiChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Convert to Invoice Confirmation Modal */}
            {convertConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                            <HiDocumentText className="w-7 h-7 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Convert to Invoice?</h3>
                        <p className="text-sm text-gray-500 mb-1">
                            <span className="font-semibold text-gray-700">{convertConfirm.challanNumber}</span> will be converted into a new invoice.
                        </p>
                        <p className="text-xs text-gray-400 mb-6">
                            You'll be redirected to review and complete the invoice.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConvertConfirm(null)}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConvertToInvoice}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                            >
                                Convert
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <HiTrash className="w-7 h-7 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Delivery Challan?</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            <span className="font-semibold text-gray-700">{deleteConfirm.challanNumber}</span> will be permanently deleted.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
                            <button onClick={handleDelete} disabled={deleting}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-60">
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
