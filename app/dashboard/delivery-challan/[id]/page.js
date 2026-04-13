'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { deliveryChallansAPI, shopAPI } from '@/utils/api';
import { HiPencil, HiTrash, HiPrinter, HiTruck, HiDocumentText } from 'react-icons/hi';
import ThermalReceiptTemplate from '@/components/invoice-templates/ThermalReceiptTemplate';

const STATUS_COLOR = {
    DRAFT: 'bg-gray-100 text-gray-700',
    DISPATCHED: 'bg-blue-100 text-blue-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
};

export default function DeliveryChallanDetail() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const toast = useToast();
    const [challan, setChallan] = useState(null);
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
            const [cd, sd] = await Promise.all([deliveryChallansAPI.getOne(params.id), shopAPI.get()]);
            setChallan(cd); setShopSettings(sd);
        } catch (e) { toast.error(e.message || 'Failed to load'); }
        finally { setLoadingData(false); }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deliveryChallansAPI.delete(params.id);
            toast.success('Delivery challan deleted');
            router.push('/dashboard/delivery-challan');
        } catch (e) { toast.error(e.message || 'Failed to delete'); }
        finally { setDeleting(false); }
    };

    const handleConvert = () => {
        // Redirect to invoice creation page with challan data
        router.push(`/dashboard/invoices/new?fromChallan=${params.id}`);
    };

    const handlePrint = () => {
        const originalTitle = document.title;
        document.title = `Challan_${challan?.challanNumber || 'Document'}`;
        window.print();
        setTimeout(() => { document.title = originalTitle; }, 500);
    };

    if (loading || !user) return null;

    const shop = shopSettings || {};
    const c = challan || {};

    return (
        <>
            <style>{`
                @page { size: A4 auto; margin: 10mm; }
                @media print {
                    body * { visibility: hidden; }
                    .dc, .dc * { visibility: visible; }
                    html, body { background: white; margin: 0; padding: 0; width: auto; }
                    .dc { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; box-shadow: none; border: none; }
                    .no-print { display: none !important; }
                }
            `}</style>
            <DashboardLayout>
                {loadingData ? (
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <LoadingSpinner size="lg" text="Loading delivery challan..." />
                    </div>
                ) : (
                <div className="max-w-4xl mx-auto space-y-4">
                    {/* Action bar */}
                    <div className="no-print flex items-center justify-between bg-white rounded-xl border border-gray-200 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <button onClick={() => router.push('/dashboard/delivery-challan')} className="text-sm text-gray-500 hover:text-gray-700">← Delivery Challans</button>
                            {challan && <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[challan.status] || STATUS_COLOR.DRAFT}`}>{challan.status}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Convert to Invoice */}
                            {!challan?.convertedToInvoiceId ? (
                                <button onClick={handleConvert}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
                                    <HiDocumentText className="w-4 h-4" />Convert to Invoice
                                </button>
                            ) : (
                                <button onClick={() => router.push(`/dashboard/invoices/${challan.convertedToInvoiceId}`)}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 text-sm font-medium">
                                    <HiDocumentText className="w-4 h-4" />View Invoice
                                </button>
                            )}
                            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">
                                <HiPrinter className="w-4 h-4" />Print / PDF
                            </button>
                            <button onClick={() => router.push(`/dashboard/delivery-challan/${params.id}/edit`)}
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
                    {challan && (
                        shop?.invoiceTemplate === 'thermal-receipt' ? (
                            <ThermalReceiptTemplate invoice={c} shopSettings={shop} type="challan" />
                        ) : (
                        <div className="dc bg-white rounded-xl border border-gray-200 p-8">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">{shop.shopName || 'Your Business'}</h1>
                                    {shop.address && <p className="text-sm text-gray-600 mt-1">{shop.address}</p>}
                                    {shop.phone && <p className="text-sm text-gray-600">{shop.phone}</p>}
                                    {shop.gstin && <p className="text-sm text-gray-600">GSTIN: {shop.gstin}</p>}
                                </div>
                                <div className="text-right">
                                    <div className="inline-block bg-teal-50 border border-teal-200 rounded-xl px-6 py-3">
                                        <div className="flex items-center gap-2 justify-end">
                                            <HiTruck className="w-4 h-4 text-teal-600" />
                                            <p className="text-xs font-semibold text-teal-500 uppercase tracking-wider">Delivery Challan</p>
                                        </div>
                                        <p className="text-2xl font-bold text-teal-700 mt-1">{c.challanNumber}</p>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">Date: {c.challanDate ? new Date(c.challanDate).toLocaleDateString('en-IN') : '—'}</p>
                                </div>
                            </div>

                            {/* Dispatch Info */}
                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Deliver To</p>
                                    <p className="font-semibold text-gray-900">{c.customerName}</p>
                                    {c.customerPhone && <p className="text-sm text-gray-600">{c.customerPhone}</p>}
                                    {c.deliveryAddress && <p className="text-sm text-gray-600 mt-1">{c.deliveryAddress}</p>}
                                    {c.customerGstin && <p className="text-sm text-gray-600">GSTIN: {c.customerGstin}</p>}
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Transport Details</p>
                                    {c.vehicleNumber && <p className="text-sm text-gray-700"><span className="font-medium">Vehicle:</span> {c.vehicleNumber}</p>}
                                    {c.transporterName && <p className="text-sm text-gray-700"><span className="font-medium">Transporter:</span> {c.transporterName}</p>}
                                    {c.transporterDoc && <p className="text-sm text-gray-700"><span className="font-medium">LR/Doc No:</span> {c.transporterDoc}</p>}
                                </div>
                            </div>

                            {/* Items Table + Totals */}
                            {(() => {
                                const getItemDiscount = (item) => {
                                    if ((item.discountAmount || 0) > 0) return item.discountAmount;
                                    const gross = (item.sellingPrice || 0) * (item.quantity || 0);
                                    const taxable = item.taxableAmount !== undefined ? item.taxableAmount : gross;
                                    return Math.max(0, gross - taxable);
                                };
                                const hasItemDiscounts = (c.items || []).some(i => getItemDiscount(i) > 0);
                                const preDiscountTotal = (c.items || []).reduce((s, i) => s + (i.sellingPrice || 0) * (i.quantity || 0), 0);
                                const totalDiscount = c.discount || 0;
                                const taxableSubtotal = preDiscountTotal - totalDiscount;
                                const totalTax = (c.totalCGST || 0) + (c.totalSGST || 0) + (c.totalIGST || 0);
                                const roundOff = c.roundOff || 0;
                                const correctGrandTotal = taxableSubtotal + totalTax + roundOff;
                                return (
                                <>
                                <table className="w-full mb-8">
                                    <thead>
                                        <tr className="border-b-2 border-gray-200">
                                            <th className="text-left py-3 text-sm font-semibold text-gray-600">#</th>
                                            <th className="text-left py-3 text-sm font-semibold text-gray-600">Item / Description</th>
                                            <th className="text-right py-3 text-sm font-semibold text-gray-600">Qty</th>
                                            <th className="text-right py-3 text-sm font-semibold text-gray-600">Unit</th>
                                            <th className="text-right py-3 text-sm font-semibold text-gray-600">Rate</th>
                                            {hasItemDiscounts && <th className="text-right py-3 text-sm font-semibold text-gray-600">Discount</th>}
                                            {shop.gstScheme !== 'COMPOSITION' && <th className="text-right py-3 text-sm font-semibold text-gray-600">GST</th>}
                                            <th className="text-right py-3 text-sm font-semibold text-gray-600">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(c.items || []).map((item, idx) => {
                                            const disc = getItemDiscount(item);
                                            const taxable = (item.sellingPrice || 0) * (item.quantity || 0) - disc;
                                            const tax = shop.gstScheme === 'COMPOSITION' ? 0 : taxable * ((item.gstRate || 0) / 100);
                                            const total = taxable + tax;
                                            return (
                                                <tr key={idx}>
                                                    <td className="py-3 text-sm text-gray-500">{idx + 1}</td>
                                                    <td className="py-3 text-sm text-gray-900">
                                                        <div className="font-medium">{item.productName || item.serviceName || 'Item'}</div>
                                                        {item.description && <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>}
                                                    </td>
                                                    <td className="py-3 text-sm text-gray-700 text-right">{item.quantity || 0}</td>
                                                    <td className="py-3 text-sm text-gray-600 text-right">{item.unit || 'PCS'}</td>
                                                    <td className="py-3 text-sm text-gray-700 text-right">₹{Number(item.sellingPrice || 0).toFixed(2)}</td>
                                                    {hasItemDiscounts && (
                                                        <td className="py-3 text-sm text-right">
                                                            {disc > 0
                                                                ? <span className="text-emerald-600 font-medium">-₹{disc.toFixed(2)}</span>
                                                                : <span className="text-gray-300">—</span>
                                                            }
                                                        </td>
                                                    )}
                                                    {shop.gstScheme !== 'COMPOSITION' && <td className="py-3 text-sm text-gray-600 text-right">{item.gstRate || 0}%</td>}
                                                    <td className="py-3 text-sm font-medium text-gray-900 text-right">₹{total.toFixed(2)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Totals Section */}
                                <div className="border-t-2 border-gray-200 pt-4">
                                    <div className="flex justify-end">
                                        <div className="w-80 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Price:</span>
                                                <span className="font-medium text-gray-900">₹{preDiscountTotal.toFixed(2)}</span>
                                            </div>
                                            {totalDiscount > 0 && (
                                                <div className="flex justify-between text-sm text-gray-500">
                                                    <span>Discount:</span>
                                                    <span className="text-red-500">-₹{totalDiscount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Subtotal:</span>
                                                <span className="font-medium text-gray-900">₹{taxableSubtotal.toFixed(2)}</span>
                                            </div>
                                            {shop.gstScheme !== 'COMPOSITION' && c.taxType !== 'NONE' && totalTax > 0 && (
                                                <>
                                                    {c.taxType === 'CGST_SGST' && (
                                                        <>
                                                            <div className="flex justify-between text-sm text-gray-500">
                                                                <span>CGST:</span>
                                                                <span>₹{Number(c.totalCGST || 0).toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm text-gray-500">
                                                                <span>SGST:</span>
                                                                <span>₹{Number(c.totalSGST || 0).toFixed(2)}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                    {c.taxType === 'IGST' && (
                                                        <div className="flex justify-between text-sm text-gray-500">
                                                            <span>IGST:</span>
                                                            <span>₹{Number(c.totalIGST || 0).toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {roundOff !== 0 && (
                                                <div className="flex justify-between text-xs text-gray-400">
                                                    <span>Round Off:</span>
                                                    <span>₹{roundOff.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-bold">
                                                <span className="text-gray-700">Grand Total:</span>
                                                <span className="text-teal-600">₹{correctGrandTotal.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                </>
                                );
                            })()}

                            {/* Notes */}
                            {c.notes && (
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
                                    <p className="text-sm text-gray-700">{c.notes}</p>
                                </div>
                            )}

                            {/* Signature */}
                            <div className="mt-10 pt-6 border-t border-gray-200 grid grid-cols-3 gap-8">
                                {['Prepared By', 'Checked By', 'Received By'].map(label => (
                                    <div key={label} className="text-center">
                                        <div className="h-12 border-b border-gray-300 mb-2"></div>
                                        <p className="text-xs text-gray-500">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        )
                    )}
                </div>
                )}
            </DashboardLayout>

            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><HiTrash className="w-7 h-7 text-red-600" /></div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Delivery Challan?</h3>
                        <p className="text-sm text-gray-500 mb-2"><span className="font-semibold">{challan?.challanNumber}</span> will be permanently deleted.</p>
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
