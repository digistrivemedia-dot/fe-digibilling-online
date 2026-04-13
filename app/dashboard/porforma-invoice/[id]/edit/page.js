'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import PageLoader from '@/components/PageLoader';
import Modal from '@/components/Modal';
import { productsAPI, customersAPI, proformaInvoicesAPI, shopAPI } from '@/utils/api';
import { calculateInvoiceTotals, calculateItemWithDiscount } from '@/utils/calculations';
import { HiPlus, HiSearch, HiX, HiExclamation } from 'react-icons/hi';

export default function EditProformaInvoice() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const toast = useToast();

    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [shopSettings, setShopSettings] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [items, setItems] = useState([]);
    const [taxType, setTaxType] = useState('CGST_SGST');
    const [notes, setNotes] = useState('');
    const [terms, setTerms] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [proformaDate, setProformaDate] = useState('');
    const [status, setStatus] = useState('DRAFT');
    const [submitting, setSubmitting] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [savingCustomer, setSavingCustomer] = useState(false);
    const [customerFormErrors, setCustomerFormErrors] = useState({});
    const [customerFormData, setCustomerFormData] = useState({
        name: '', phone: '', email: '', gstin: '', address: '', city: '', state: '', pincode: '',
    });

    // PO and Additional details
    const [po, setPo] = useState({ poNumber: '', poDate: '' });
    const [additionalDetails, setAdditionalDetails] = useState({
        eWayBillNumber: '', deliveryNote: '', referenceNo: '', otherReferences: '', termsOfDelivery: '', destination: '',
    });

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
        else if (user) loadData();
    }, [user, authLoading]);

    useEffect(() => {
        const handler = (e) => {
            if (isCustomerDropdownOpen && !e.target.closest('.customer-dropdown-container')) {
                setIsCustomerDropdownOpen(false); setCustomerSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isCustomerDropdownOpen]);

    const loadData = async () => {
        try {
            const [batchesData, customersData, pd, shopData] = await Promise.all([
                productsAPI.getBatchesForInvoice(),
                customersAPI.getAll(),
                proformaInvoicesAPI.getOne(params.id),
                shopAPI.get(),
            ]);
            setProducts(batchesData);
            setCustomers(customersData);
            setShopSettings(shopData);
            setCustomerName(pd.customerName || '');
            setCustomerPhone(pd.customerPhone || '');
            setTaxType(pd.taxType || 'CGST_SGST');
            setNotes(pd.notes || '');
            setTerms(pd.terms || '');
            setStatus(pd.status || 'DRAFT');
            setProformaDate(pd.proformaDate ? new Date(pd.proformaDate).toISOString().split('T')[0] : '');
            setItems((pd.items || []).map(item => ({
                itemType: item.itemType || 'product',
                product: item.product?._id || item.product || '',
                batch: item.batch?._id || item.batch || '',
                selectedBatch: '',
                productName: item.productName || '',
                serviceName: item.serviceName || '',
                sacCode: item.sacCode || '',
                quantity: item.quantity || 1,
                unit: item.unit || 'PCS',
                sellingPrice: item.sellingPrice || 0,
                discountAmount: item.discountAmount || 0,
                gstRate: item.gstRate || 0,
                availableQuantity: null,
            })));
            // Load PO and Additional details
            setPo({
                poNumber: pd.poNumber || '',
                poDate: pd.poDate ? new Date(pd.poDate).toISOString().split('T')[0] : '',
            });
            setAdditionalDetails({
                eWayBillNumber: pd.eWayBillNumber || '',
                deliveryNote: pd.deliveryNote || '',
                referenceNo: pd.referenceNo || '',
                otherReferences: pd.otherReferences || '',
                termsOfDelivery: pd.termsOfDelivery || '',
                destination: pd.destination || '',
            });
            if (pd.customer) {
                const matched = customersData.find(c => c._id === (pd.customer?._id || pd.customer));
                if (matched) setSelectedCustomer(matched);
            }
        } catch (e) { toast.error(e.message || 'Failed to load proforma'); }
        finally { setLoadingData(false); }
    };

    const handleCustomerChange = (customerId) => {
        if (customerId) {
            const c = customers.find(c => c._id === customerId);
            setSelectedCustomer(c); setCustomerName(c.name); setCustomerPhone(c.phone);
        } else { setSelectedCustomer(null); setCustomerName(''); setCustomerPhone(''); }
        setIsCustomerDropdownOpen(false); setCustomerSearchTerm('');
    };

    const handleCreateCustomer = async (e) => {
        e.preventDefault();
        const errors = {};
        if (!customerFormData.name.trim()) errors.name = 'Name is required';
        if (!customerFormData.phone.trim()) errors.phone = 'Phone is required';
        if (Object.keys(errors).length) { setCustomerFormErrors(errors); return; }
        setSavingCustomer(true);
        try {
            const nc = await customersAPI.create(customerFormData);
            const cd = await customersAPI.getAll();
            setCustomers(cd); setSelectedCustomer(nc); setCustomerName(nc.name); setCustomerPhone(nc.phone);
            setShowCustomerModal(false);
            setCustomerFormData({ name: '', phone: '', email: '', gstin: '', address: '', city: '', state: '', pincode: '' });
            setCustomerFormErrors({});
            toast.success('Customer added!');
        } catch (e) { toast.error(e.message || 'Failed to add customer'); }
        finally { setSavingCustomer(false); }
    };

    const addItem = () => setItems([...items, { product: '', batch: '', selectedBatch: '', quantity: 1, sellingPrice: 0, gstRate: 12 }]);
    const removeItem = (index) => setItems(items.filter((_, i) => i !== index));
    const updateItem = (index, field, value) => {
        const updated = [...items];
        if (field === 'product' && value) {
            try {
                const batch = JSON.parse(value);
                updated[index] = { ...updated[index], selectedBatch: value, batch: batch.batchId, product: batch.productId, productName: batch.productName, sellingPrice: batch.sellingPrice, gstRate: batch.gstRate, mrp: batch.mrp, availableQuantity: batch.availableQuantity };
            } catch { updated[index][field] = value; }
        } else { updated[index][field] = value; }
        setItems(updated);
    };

    const calculateTotals = () => {
        const result = calculateInvoiceTotals(items, 0, taxType, 0, shopSettings);
        return {
            subtotal: result.subtotal,
            totalDiscount: result.totalDiscount,
            totalTax: result.totalTax,
            grandTotal: result.grandTotal,
            roundOff: result.roundOff,
            finalTotal: result.finalTotal
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (items.length === 0) { toast.error('Add at least one item'); return; }
        if (!customerName.trim()) { toast.error('Customer name is required'); return; }
        setSubmitting(true);
        try {
            const totals = calculateTotals();
            await proformaInvoicesAPI.update(params.id, {
                customer: selectedCustomer?._id,
                customerName, customerPhone,
                customerAddress: selectedCustomer?.address,
                customerGstin: selectedCustomer?.gstin,
                proformaDate, status,
                items: items.map(i => ({ ...i, discountAmount: i.discountAmount || 0 })),
                taxType,
                subtotal: totals.subtotal, totalTax: totals.totalTax,
                totalCGST: taxType === 'CGST_SGST' ? totals.totalTax / 2 : 0,
                totalSGST: taxType === 'CGST_SGST' ? totals.totalTax / 2 : 0,
                totalIGST: taxType === 'IGST' ? totals.totalTax : 0,
                discount: totals.totalDiscount || 0, roundOff: totals.roundOff, grandTotal: totals.finalTotal, notes, terms,
                // PO details
                poNumber: po.poNumber,
                poDate: po.poDate || undefined,
                // Additional details
                eWayBillNumber: additionalDetails.eWayBillNumber,
                deliveryNote: additionalDetails.deliveryNote,
                referenceNo: additionalDetails.referenceNo,
                otherReferences: additionalDetails.otherReferences,
                termsOfDelivery: additionalDetails.termsOfDelivery,
                destination: additionalDetails.destination,
            });
            toast.success('Proforma invoice updated!');
            router.push(`/dashboard/porforma-invoice/${params.id}`);
        } catch (e) { toast.error(e.message || 'Failed to update'); }
        finally { setSubmitting(false); }
    };

    const totals = calculateTotals();
    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || c.phone.includes(customerSearchTerm)
    );

    if (authLoading || !user) return null;
    if (loadingData) return <DashboardLayout><PageLoader /></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Edit Proforma Invoice</h1>
                    <p className="mt-1 text-sm text-gray-600">Update the proforma invoice details</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 text-black">
                    {/* Customer & Details */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer & Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative customer-dropdown-container">
                                        <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer"
                                            onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}>
                                            <div className="flex items-center justify-between">
                                                <span className={selectedCustomer ? 'text-gray-900' : 'text-gray-500'}>
                                                    {selectedCustomer ? `${selectedCustomer.name} – ${selectedCustomer.phone}` : 'Select customer...'}
                                                </span>
                                                {selectedCustomer && (
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleCustomerChange(''); }}>
                                                        <HiX className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {isCustomerDropdownOpen && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
                                                <div className="p-2 border-b border-gray-200">
                                                    <div className="relative">
                                                        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                        <input type="text" placeholder="Search..." value={customerSearchTerm}
                                                            onChange={(e) => setCustomerSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()}
                                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500" autoFocus />
                                                    </div>
                                                </div>
                                                <div className="max-h-60 overflow-y-auto">
                                                    {filteredCustomers.map(c => (
                                                        <div key={c._id} onClick={() => handleCustomerChange(c._id)}
                                                            className="px-4 py-2 hover:bg-violet-50 cursor-pointer border-t border-gray-100">
                                                            <div className="font-medium text-gray-900">{c.name}</div>
                                                            <div className="text-sm text-gray-500">{c.phone}</div>
                                                        </div>
                                                    ))}
                                                    {filteredCustomers.length === 0 && <div className="px-4 py-3 text-sm text-gray-500 text-center">No customers found</div>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => setShowCustomerModal(true)} className="px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
                                        <HiPlus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                                <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Proforma Date *</label>
                                <input type="date" value={proformaDate} onChange={(e) => setProformaDate(e.target.value)} required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select value={status} onChange={(e) => setStatus(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500">
                                    <option value="DRAFT">Draft</option>
                                    <option value="SENT">Sent</option>
                                    <option value="CONFIRMED">Confirmed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tax Type</label>
                                <select value={taxType} onChange={(e) => setTaxType(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500">
                                    <option value="CGST_SGST">CGST + SGST (Same State)</option>
                                    <option value="IGST">IGST (Interstate)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Items</h2>
                            <button type="button" onClick={addItem} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">+ Add Item</button>
                        </div>
                        <div className="space-y-4">
                            {items.length > 0 && (
                                <div className="flex gap-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                                    <div className="flex-1">Product</div><div className="w-16">Qty</div><div className="w-24">Discount</div><div className="w-28">Price</div><div className="w-20">GST %</div><div className="w-28">Total</div><div className="w-8"></div>
                                </div>
                            )}
                            {items.map((item, index) => {
                                const lineTotal = calculateItemWithDiscount(item, null).itemTotal;
                                return (
                                <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                        <select value={item.selectedBatch || ''} onChange={(e) => updateItem(index, 'product', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500">
                                            <option value="">{item.productName || item.serviceName || 'Select Product'}</option>
                                            {products.map(b => <option key={b.batchId} value={JSON.stringify(b)}>{b.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-16">
                                        <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                    </div>
                                    <div className="w-24">
                                        <input type="number" min="0" step="0.01" placeholder="0.00" value={item.discountAmount || 0}
                                            onChange={e => {
                                                const val = Number(e.target.value);
                                                const max = item.quantity * item.sellingPrice;
                                                if (val > max) {
                                                    toast.error(`Discount cannot exceed ₹${max.toFixed(2)}`);
                                                    updateItem(index, 'discountAmount', max);
                                                } else {
                                                    updateItem(index, 'discountAmount', val);
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm text-right" />
                                    </div>
                                    <div className="w-28">
                                        <input type="number" step="0.01" value={item.sellingPrice} onChange={(e) => updateItem(index, 'sellingPrice', Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                    </div>
                                    <div className="w-20">
                                        <select value={item.gstRate} onChange={(e) => updateItem(index, 'gstRate', Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                            {[0, 0.25, 3, 5, 12, 18, 28, 40].map(r => <option key={r} value={r}>{r}%</option>)}
                                        </select>
                                    </div>
                                    <div className="w-28 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm">
                                        ₹{lineTotal.toFixed(2)}
                                    </div>
                                    <button type="button" onClick={() => removeItem(index)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg">✕</button>
                                </div>
                                );
                            })}
                            {items.length === 0 && <div className="text-center py-8 text-gray-500">No items. Click "Add Item" to start.</div>}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal:</span><span className="font-medium">₹{totals.subtotal.toFixed(2)}</span></div>
                            {totals.totalDiscount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Total Discount:</span>
                                    <span className="text-emerald-600 font-medium">-₹{totals.totalDiscount.toFixed(2)}</span>
                                </div>
                            )}
                            {totals.totalTax > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">{taxType === 'CGST_SGST' ? 'CGST + SGST' : 'IGST'}:</span><span className="font-medium">₹{totals.totalTax.toFixed(2)}</span></div>}
                            <div className="pt-3 border-t border-gray-200 flex justify-between text-lg font-bold">
                                <span>Grand Total:</span><span className="text-violet-600">₹{totals.finalTotal.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                    {/* PO Details */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase Order Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">P.O. Number</label>
                                <input type="text" value={po.poNumber} onChange={(e) => setPo({ ...po, poNumber: e.target.value })}
                                    placeholder="Purchase Order Number"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">P.O. Date</label>
                                <input type="date" value={po.poDate} onChange={(e) => setPo({ ...po, poDate: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500" />
                            </div>
                        </div>
                    </div>

                    {/* Additional Details */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { label: 'E-Way Bill Number', key: 'eWayBillNumber', placeholder: 'E-Way Bill No.' },
                                { label: 'Delivery Note', key: 'deliveryNote', placeholder: 'Delivery note reference' },
                                { label: 'Reference No.', key: 'referenceNo', placeholder: 'Internal reference' },
                                { label: 'Other References', key: 'otherReferences', placeholder: 'Any other references' },
                                { label: 'Terms of Delivery', key: 'termsOfDelivery', placeholder: 'e.g. Ex-Works, CIF' },
                                { label: 'Destination', key: 'destination', placeholder: 'Final destination' },
                            ].map(({ label, key, placeholder }) => (
                                <div key={key}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                                    <input type="text" placeholder={placeholder} value={additionalDetails[key]}
                                        onChange={(e) => setAdditionalDetails({ ...additionalDetails, [key]: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes & Terms */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes & Terms</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 resize-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
                                <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 resize-none" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={() => router.push(`/dashboard/porforma-invoice/${params.id}`)}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={submitting || items.length === 0}
                            className="px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>

            <Modal isOpen={showCustomerModal} onClose={() => { setShowCustomerModal(false); setCustomerFormErrors({}); }} title="Add New Customer" size="max-w-2xl">
                <form onSubmit={handleCreateCustomer} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black">
                        {[['name', 'Customer Name', true, 'text'], ['phone', 'Phone', true, 'tel'], ['email', 'Email', false, 'email'], ['gstin', 'GSTIN', false, 'text']].map(([field, label, required, type]) => (
                            <div key={field}>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
                                <input type={type} value={customerFormData[field]}
                                    onChange={(e) => { setCustomerFormData({ ...customerFormData, [field]: e.target.value }); if (customerFormErrors[field]) setCustomerFormErrors({ ...customerFormErrors, [field]: '' }); }}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 ${customerFormErrors[field] ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-violet-500'}`} />
                                {customerFormErrors[field] && <p className="text-sm text-red-600 flex items-center mt-1"><HiExclamation className="w-4 h-4 mr-1" />{customerFormErrors[field]}</p>}
                            </div>
                        ))}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                            <textarea value={customerFormData.address} rows={2}
                                onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500" />
                        </div>
                        {['city', 'state', 'pincode'].map(field => (
                            <div key={field}>
                                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">{field}</label>
                                <input type="text" value={customerFormData[field]}
                                    onChange={(e) => setCustomerFormData({ ...customerFormData, [field]: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500" />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <button type="button" onClick={() => { setShowCustomerModal(false); setCustomerFormErrors({}); }}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={savingCustomer}
                            className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50">
                            {savingCustomer ? 'Saving...' : 'Add Customer'}
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
}
