'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import { useProductsStore } from '@/store/useProductsStore';
import { inventoryAPI } from '@/utils/api';
import {
    HiAdjustments,
    HiPlus,
    HiX,
    HiSearch,
    HiExclamation,
    HiArrowDown,
    HiArrowUp,
    HiFire,
    HiRefresh,
    HiBeaker,
    HiCollection,
} from 'react-icons/hi';

// ── Adjustment type config ────────────────────────────────────────────────────
const ADJUSTMENT_TYPES = [
    {
        value: 'CONSUMED',
        label: 'Stock Consumed',
        desc: 'Raw material used in production / manufacturing',
        icon: HiFire,
        color: 'orange',
        direction: 'out',
    },
    {
        value: 'PRODUCTION',
        label: 'Production Entry',
        desc: 'Finished goods produced from raw materials',
        icon: HiBeaker,
        color: 'green',
        direction: 'in',
    },
    {
        value: 'MANUAL_ADD',
        label: 'Manual Add',
        desc: 'Stock added manually (found stock, correction)',
        icon: HiArrowDown,
        color: 'blue',
        direction: 'in',
    },
    {
        value: 'MANUAL_REMOVE',
        label: 'Manual Remove',
        desc: 'Stock removed manually (correction, write-off)',
        icon: HiArrowUp,
        color: 'red',
        direction: 'out',
    },
    {
        value: 'DAMAGE',
        label: 'Damage / Loss',
        desc: 'Damaged, lost, stolen or spoiled goods',
        icon: HiExclamation,
        color: 'red',
        direction: 'out',
    },
    {
        value: 'EXPIRY',
        label: 'Expiry Write-off',
        desc: 'Expired stock written off from inventory',
        icon: HiCollection,
        color: 'yellow',
        direction: 'out',
    },
    {
        value: 'TRANSFER',
        label: 'Stock Transfer',
        desc: 'Transfer between locations / warehouses',
        icon: HiRefresh,
        color: 'purple',
        direction: 'neutral',
    },
];

const colorMap = {
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
    green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', icon: 'text-green-600', badge: 'bg-green-100 text-green-700' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
    red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', icon: 'text-red-600', badge: 'bg-red-100 text-red-700' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
};

export default function StockAdjustments() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const toast = useToast();

    const { items: products, loading: loadingProducts, fetchItems: fetchProducts, invalidate: invalidateProducts } = useProductsStore();
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // Form state
    const [form, setForm] = useState({
        type: '',
        productId: '',
        batchId: '',
        quantity: '',
        date: new Date().toISOString().split('T')[0],
        reason: '',
        notes: '',
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (user) {
            fetchProducts().catch(err => console.error('Error loading products:', err));
            loadHistory();
        }
    }, [user, loading, router]);

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            const data = await inventoryAPI.getAdjustments();
            setHistory(data);
        } catch (err) {
            console.error('Error loading adjustment history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const selectedType = ADJUSTMENT_TYPES.find((t) => t.value === form.type);
    const selectedProduct = products.find((p) => p._id === form.productId);
    const availableBatches = selectedProduct?.batches || [];

    const validate = () => {
        const e = {};
        if (!form.type) e.type = 'Please select an adjustment type';
        if (!form.productId) e.productId = 'Please select a product';
        if (!form.quantity || parseFloat(form.quantity) <= 0) e.quantity = 'Enter a valid quantity';
        if (!form.date) e.date = 'Date is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            const adjustment = await inventoryAPI.createAdjustment({
                productId: form.productId,
                batchId: form.batchId || undefined,
                type: form.type,
                quantity: parseFloat(form.quantity),
                date: form.date,
                reason: form.reason,
                notes: form.notes,
            });
            setHistory((prev) => [adjustment, ...prev]);
            invalidateProducts(); // stock has changed
            toast.success('Stock adjustment recorded successfully!');
            resetForm();
            setShowModal(false);
        } catch (err) {
            toast.error(err.message || 'Failed to record adjustment');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setForm({
            type: '',
            productId: '',
            batchId: '',
            quantity: '',
            date: new Date().toISOString().split('T')[0],
            reason: '',
            notes: '',
        });
        setErrors({});
    };

    const filteredHistory = history.filter((h) =>
        !searchTerm ||
        h.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.type?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const typeDef = (type) => ADJUSTMENT_TYPES.find((t) => t.value === type);

    if (loading || !user) return null;

    return (
        <DashboardLayout>
            <div className="space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30">
                            <HiAdjustments className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Stock Adjustments</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Record stock consumed, produced, damaged, or manually corrected</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                    >
                        <HiPlus className="w-5 h-5" />
                        New Adjustment
                    </button>
                </div>

                {/* Type cards summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {ADJUSTMENT_TYPES.map((t) => {
                        const c = colorMap[t.color];
                        const Icon = t.icon;
                        const count = history.filter((h) => h.type === t.value).length;
                        return (
                            <div key={t.value} className={`bg-white rounded-xl border ${c.border} p-3 text-center`}>
                                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${c.bg} mx-auto mb-1.5`}>
                                    <Icon className={`w-5 h-5 ${c.icon}`} />
                                </div>
                                <p className={`text-xs font-semibold ${c.text} leading-tight`}>{t.label}</p>
                                <p className="text-lg font-bold text-gray-800 mt-0.5">{count}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Search + History table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative">
                            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search adjustments by product or type..."
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-black"
                            />
                        </div>
                    </div>

                    {loadingHistory ? (
                        <div className="flex items-center justify-center py-16 text-gray-400">
                            <p className="text-sm">Loading history...</p>
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <div className="p-4 bg-gray-100 rounded-full mb-4">
                                <HiAdjustments className="w-10 h-10 text-gray-300" />
                            </div>
                            <p className="font-medium text-gray-500">No adjustments recorded yet</p>
                            <p className="text-sm mt-1">Click &quot;New Adjustment&quot; to get started</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['Date', 'Type', 'Product', 'Batch', 'Qty', 'Reason'].map((col) => (
                                            <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredHistory.map((h) => {
                                        const t = typeDef(h.type);
                                        const c = colorMap[t?.color || 'blue'];
                                        return (
                                            <tr key={h._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-5 py-3 text-sm text-gray-600">
                                                    {new Date(h.date).toLocaleDateString('en-IN')}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${c.badge}`}>
                                                        {t?.label || h.type}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-sm font-medium text-gray-900">{h.product?.name}</td>
                                                <td className="px-5 py-3 text-sm text-gray-500">{h.batch?.batchNo || 'N/A'}</td>
                                                <td className="px-5 py-3 text-sm font-semibold text-gray-900">
                                                    <span className={h.direction === 'in' ? 'text-green-600' : h.direction === 'out' ? 'text-red-600' : 'text-gray-700'}>
                                                        {h.direction === 'in' ? '+' : h.direction === 'out' ? '-' : ''}
                                                        {h.quantity} {h.product?.unit || ''}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-gray-500">{h.reason || '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── New Adjustment Modal ── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Modal header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-xl">
                                    <HiAdjustments className="w-5 h-5 text-indigo-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">New Stock Adjustment</h2>
                            </div>
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <HiX className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-black">

                            {/* Adjustment Type */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Adjustment Type <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {ADJUSTMENT_TYPES.map((t) => {
                                        const c = colorMap[t.color];
                                        const Icon = t.icon;
                                        const isSelected = form.type === t.value;
                                        return (
                                            <button
                                                key={t.value}
                                                type="button"
                                                onClick={() => setForm({ ...form, type: t.value })}
                                                className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${isSelected
                                                        ? `${c.border} ${c.bg}`
                                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                                    }`}
                                            >
                                                <div className={`p-1.5 rounded-lg ${c.bg} flex-shrink-0`}>
                                                    <Icon className={`w-4 h-4 ${c.icon}`} />
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-semibold ${isSelected ? c.text : 'text-gray-800'}`}>{t.label}</p>
                                                    <p className="text-xs text-gray-500 leading-tight mt-0.5">{t.desc}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {errors.type && <p className="text-sm text-red-500 mt-1 flex items-center gap-1"><HiExclamation className="w-4 h-4" />{errors.type}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Product */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Product <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.productId}
                                        onChange={(e) => setForm({ ...form, productId: e.target.value, batchId: '' })}
                                        className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.productId ? 'border-red-400' : 'border-gray-300'}`}
                                    >
                                        <option value="">Select product</option>
                                        {products.map((p) => (
                                            <option key={p._id} value={p._id}>{p.name} ({p.stockQuantity ?? 0} {p.unit})</option>
                                        ))}
                                    </select>
                                    {errors.productId && <p className="text-sm text-red-500 mt-1">{errors.productId}</p>}
                                </div>

                                {/* Batch (optional) */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Batch <span className="text-xs text-gray-400">(Optional — uses FIFO if blank)</span>
                                    </label>
                                    <select
                                        value={form.batchId}
                                        onChange={(e) => setForm({ ...form, batchId: e.target.value })}
                                        disabled={!form.productId || availableBatches.length === 0}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                                    >
                                        <option value="">All batches (auto)</option>
                                        {availableBatches.map((b) => (
                                            <option key={b._id} value={b._id}>
                                                {b.batchNo || 'Auto'} — {b.quantity} {selectedProduct?.unit}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Quantity */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Quantity <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={form.quantity}
                                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                        className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.quantity ? 'border-red-400' : 'border-gray-300'}`}
                                        placeholder="0"
                                    />
                                    {errors.quantity && <p className="text-sm text-red-500 mt-1">{errors.quantity}</p>}
                                </div>

                                {/* Date */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Reason */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Reason</label>
                                    <input
                                        type="text"
                                        value={form.reason}
                                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="e.g. Used in batch production run #12"
                                    />
                                </div>

                                {/* Notes */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                                    <textarea
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        rows={2}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="Any additional notes..."
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Record Adjustment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
