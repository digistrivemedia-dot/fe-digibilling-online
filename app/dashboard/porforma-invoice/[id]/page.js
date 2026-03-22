'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { proformaInvoicesAPI, shopAPI } from '@/utils/api';
import { HiPencil, HiTrash, HiPrinter, HiDocumentText } from 'react-icons/hi';

const STATUS_COLOR = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SENT: 'bg-blue-100 text-blue-700',
    CONFIRMED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
    CONVERTED: 'bg-purple-100 text-purple-700',
};

export default function ProformaInvoiceDetail() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const toast = useToast();
    const [proforma, setProforma] = useState(null);
    const [shopSettings, setShopSettings] = useState(null);
    const [loadingData, setLoadingData] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
        else if (user) loadData();
    }, [user, loading]);

    const loadData = async () => {
        try {
            const [pd, sd] = await Promise.all([proformaInvoicesAPI.getOne(params.id), shopAPI.get()]);
            setProforma(pd); setShopSettings(sd);
        } catch (e) { toast.error(e.message || 'Failed to load'); }
        finally { setLoadingData(false); }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await proformaInvoicesAPI.delete(params.id);
            toast.success('Proforma invoice deleted');
            router.push('/dashboard/porforma-invoice');
        } catch (e) { toast.error(e.message || 'Failed to delete'); }
        finally { setDeleting(false); }
    };

    const handleConvert = () => {
        // Redirect to invoice creation page with proforma data
        router.push(`/dashboard/invoices/new?fromProforma=${params.id}`);
    };

    if (loading || !user) return null;

    const shop = shopSettings || {};
    const p = proforma || {};

    return (
        <>
            <style>{`@media print{body *{visibility:hidden}.pp,.pp *{visibility:visible}.pp{position:fixed;left:0;top:0;width:100%}.no-print{display:none!important}}`}</style>
            <DashboardLayout>
                {loadingData ? (
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <LoadingSpinner size="lg" text="Loading proforma invoice..." />
                    </div>
                ) : (
                <div className="max-w-4xl mx-auto space-y-4">
                    {/* Action bar */}
                    <div className="no-print flex items-center justify-between bg-white rounded-xl border border-gray-200 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <button onClick={() => router.push('/dashboard/porforma-invoice')} className="text-sm text-gray-500 hover:text-gray-700">← Proforma Invoices</button>
                            {proforma && <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[proforma.status] || STATUS_COLOR.DRAFT}`}>{proforma.status}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Convert to Invoice */}
                            {!proforma?.convertedToInvoiceId ? (
                                <button onClick={handleConvert}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
                                    <HiDocumentText className="w-4 h-4" />Convert to Invoice
                                </button>
                            ) : (
                                <button onClick={() => router.push(`/dashboard/invoices/${proforma.convertedToInvoiceId}`)}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 text-sm font-medium">
                                    <HiDocumentText className="w-4 h-4" />View Invoice
                                </button>
                            )}
                            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium">
                                <HiPrinter className="w-4 h-4" />Print / PDF
                            </button>
                            <button onClick={() => router.push(`/dashboard/porforma-invoice/${params.id}/edit`)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                                <HiPencil className="w-4 h-4" />Edit
                            </button>
                            <button onClick={() => setDeleteConfirm(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium">
                                <HiTrash className="w-4 h-4" />Delete
                            </button>
                        </div>
                    </div>

                    {/* Document */}
                    {proforma && (
                        <div className="pp bg-white rounded-xl border border-gray-200 p-8">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">{shop.shopName || 'Your Business'}</h1>
                                    {shop.address && <p className="text-sm text-gray-600 mt-1">{shop.address}</p>}
                                    {shop.phone && <p className="text-sm text-gray-600">{shop.phone}</p>}
                                    {shop.gstin && <p className="text-sm text-gray-600">GSTIN: {shop.gstin}</p>}
                                </div>
                                <div className="text-right">
                                    <div className="inline-block bg-violet-50 border border-violet-200 rounded-xl px-6 py-3">
                                        <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider">Proforma Invoice</p>
                                        <p className="text-2xl font-bold text-violet-700 mt-1">{p.proformaNumber}</p>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">Date: {p.proformaDate ? new Date(p.proformaDate).toLocaleDateString('en-IN') : '—'}</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4 mb-8">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Bill To</p>
                                <p className="font-semibold text-gray-900">{p.customerName}</p>
                                {p.customerPhone && <p className="text-sm text-gray-600">{p.customerPhone}</p>}
                                {p.customerAddress && <p className="text-sm text-gray-600 mt-1">{p.customerAddress}</p>}
                                {p.customerGstin && <p className="text-sm text-gray-600">GSTIN: {p.customerGstin}</p>}
                            </div>
                            <table className="w-full mb-8">
                                <thead>
                                    <tr className="border-b-2 border-gray-200">
                                        {['#', 'Item', 'Qty', 'Rate', 'GST', 'Amount'].map((h, i) => (
                                            <th key={h} className={`py-3 text-sm font-semibold text-gray-600 ${i === 0 || i === 1 ? 'text-left' : 'text-right'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(p.items || []).map((item, idx) => {
                                        const base = item.quantity * item.sellingPrice;
                                        const tax = base * (item.gstRate / 100);
                                        return (
                                            <tr key={idx}>
                                                <td className="py-3 text-sm text-gray-500">{idx + 1}</td>
                                                <td className="py-3 text-sm text-gray-900">{item.productName || 'Product'}</td>
                                                <td className="py-3 text-sm text-gray-700 text-right">{item.quantity}</td>
                                                <td className="py-3 text-sm text-gray-700 text-right">₹{Number(item.sellingPrice).toFixed(2)}</td>
                                                <td className="py-3 text-sm text-gray-700 text-right">{item.gstRate}%</td>
                                                <td className="py-3 text-sm font-medium text-gray-900 text-right">₹{(base + tax).toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="flex justify-end">
                                <div className="w-72 space-y-2">
                                    <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span>₹{Number(p.subtotal || 0).toFixed(2)}</span></div>
                                    {Number(p.totalCGST) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">CGST</span><span>₹{Number(p.totalCGST).toFixed(2)}</span></div>}
                                    {Number(p.totalSGST) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">SGST</span><span>₹{Number(p.totalSGST).toFixed(2)}</span></div>}
                                    {Number(p.totalIGST) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">IGST</span><span>₹{Number(p.totalIGST).toFixed(2)}</span></div>}
                                    {Number(p.discount) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Discount</span><span className="text-red-600">-₹{Number(p.discount).toFixed(2)}</span></div>}
                                    <div className="pt-2 border-t-2 border-gray-200 flex justify-between font-bold text-lg">
                                        <span>Grand Total</span><span className="text-violet-600">₹{Number(p.grandTotal || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                            {(p.notes || p.terms) && (
                                <div className="mt-8 pt-6 border-t border-gray-200 space-y-3">
                                    {p.notes && <div><p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p><p className="text-sm text-gray-700">{p.notes}</p></div>}
                                    {p.terms && <div><p className="text-xs font-semibold text-gray-500 uppercase mb-1">Terms & Conditions</p><p className="text-sm text-gray-700">{p.terms}</p></div>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                )}
            </DashboardLayout>

            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><HiTrash className="w-7 h-7 text-red-600" /></div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Proforma?</h3>
                        <p className="text-sm text-gray-500 mb-2"><span className="font-semibold">{proforma?.proformaNumber}</span> will be permanently deleted.</p>
                        <p className="text-xs text-red-500 mb-6">This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
                            <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-60">
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
