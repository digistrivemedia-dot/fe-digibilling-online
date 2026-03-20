'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { productsAPI, customersAPI, proformaInvoicesAPI, shopAPI } from '@/utils/api';
import {
    HiPlus, HiSearch, HiX, HiExclamation,
    HiCube, HiLightningBolt, HiChevronDown, HiChevronUp,
    HiTruck, HiClipboardList, HiInformationCircle,
} from 'react-icons/hi';

export default function NewProformaInvoice() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const toast = useToast();

    // ── Data ───────────────────────────────────────────────────────────────
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [shopSettings, setShopSettings] = useState(null);

    // ── Customer ───────────────────────────────────────────────────────────
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [savingCustomer, setSavingCustomer] = useState(false);
    const [customerFormErrors, setCustomerFormErrors] = useState({});
    const [customerFormData, setCustomerFormData] = useState({
        name: '', phone: '', email: '', gstin: '', address: '', city: '', state: '', pincode: '',
    });

    // ── Document fields ────────────────────────────────────────────────────
    const [proformaDate, setProformaDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState('DRAFT');
    const [taxType, setTaxType] = useState('CGST_SGST');
    const [items, setItems] = useState([]);
    const [discount, setDiscount] = useState(0);
    const [notes, setNotes] = useState('');
    const [terms, setTerms] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // ── Transport accordion ────────────────────────────────────────────────
    const [showTransport, setShowTransport] = useState(false);
    const [transport, setTransport] = useState({
        mode: '', docNumber: '', docDate: '', vehicleNumber: '',
        approxDist: '', pos: '', supplyDate: '', transporterId: '', transporterName: '',
    });

    // ── PO accordion ───────────────────────────────────────────────────────
    const [showPO, setShowPO] = useState(false);
    const [po, setPo] = useState({ poNumber: '', poDate: '' });

    // ── Additional details accordion ───────────────────────────────────────
    const [showAdditional, setShowAdditional] = useState(false);
    const [additionalDetails, setAdditionalDetails] = useState({
        deliveryNote: '', referenceNo: '', otherReferences: '', termsOfDelivery: '', destination: '',
    });

    // ── Init ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!loading && !user) router.push('/login');
        else if (user) loadData();
    }, [user, loading]);

    useEffect(() => {
        const close = (e) => {
            if (isCustomerDropdownOpen && !e.target.closest('.customer-dropdown-container')) {
                setIsCustomerDropdownOpen(false);
                setCustomerSearchTerm('');
            }
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [isCustomerDropdownOpen]);

    const loadData = async () => {
        try {
            const [batchesData, customersData, shopData] = await Promise.all([
                productsAPI.getBatchesForInvoice(),
                customersAPI.getAll(),
                shopAPI.get(),
            ]);
            setProducts(batchesData);
            setCustomers(customersData);
            setShopSettings(shopData);
            if (shopData?.defaultTaxType) setTaxType(shopData.defaultTaxType);
            if (shopData?.proformaTerms) setTerms(shopData.proformaTerms);
        } catch (err) { console.error(err); }
    };

    // ── Customer helpers ───────────────────────────────────────────────────
    const handleCustomerChange = (id) => {
        if (id) {
            const c = customers.find(c => c._id === id);
            setSelectedCustomer(c);
            setCustomerName(c.name);
            setCustomerPhone(c.phone || '');
        } else {
            setSelectedCustomer(null);
            setCustomerName('');
            setCustomerPhone('');
        }
        setIsCustomerDropdownOpen(false);
        setCustomerSearchTerm('');
    };

    const handleCreateCustomer = async (e) => {
        e.preventDefault();
        const errors = {};
        if (!customerFormData.name.trim()) errors.name = 'Name is required';
        if (!customerFormData.phone.trim()) errors.phone = 'Phone is required';
        if (Object.keys(errors).length) { setCustomerFormErrors(errors); return; }
        setSavingCustomer(true);
        try {
            const newCust = await customersAPI.create(customerFormData);
            const all = await customersAPI.getAll();
            setCustomers(all);
            setSelectedCustomer(newCust);
            setCustomerName(newCust.name);
            setCustomerPhone(newCust.phone || '');
            setShowCustomerModal(false);
            setCustomerFormData({ name: '', phone: '', email: '', gstin: '', address: '', city: '', state: '', pincode: '' });
            setCustomerFormErrors({});
            toast.success('Customer added!');
        } catch (err) { toast.error(err.message || 'Failed to add customer'); }
        finally { setSavingCustomer(false); }
    };

    // ── Item helpers ───────────────────────────────────────────────────────
    const addProductItem = () => setItems(p => [...p, {
        itemType: 'product', product: '', batch: '', selectedBatch: '',
        quantity: 1, unit: 'PCS', sellingPrice: 0, gstRate: 12, mrp: '',
    }]);

    const addServiceItem = () => setItems(p => [...p, {
        itemType: 'service', serviceName: '', sacCode: '',
        quantity: 1, unit: 'NOS', sellingPrice: 0, gstRate: 18,
    }]);

    const removeItem = (i) => setItems(p => p.filter((_, idx) => idx !== i));

    const updateItem = (index, field, value) => {
        const updated = [...items];
        if (field === 'product' && value) {
            try {
                const batch = JSON.parse(value);
                updated[index].selectedBatch = value;
                updated[index].batch = batch.batchId;
                updated[index].product = batch.productId;
                updated[index].sellingPrice = batch.sellingPrice;
                updated[index].gstRate = batch.gstRate;
                updated[index].mrp = batch.mrp;
            } catch { updated[index][field] = value; }
        } else {
            updated[index][field] = value;
        }
        setItems(updated);
    };

    // ── Totals ─────────────────────────────────────────────────────────────
    const calculateTotals = () => {
        const subtotal = items.reduce((s, i) => s + i.quantity * i.sellingPrice, 0);
        const totalTax = taxType === 'NONE' ? 0
            : items.reduce((s, i) => s + (i.quantity * i.sellingPrice * i.gstRate) / 100, 0);
        const grandTotalRaw = subtotal + totalTax - discount;
        const roundOff = Math.round(grandTotalRaw) - grandTotalRaw;
        return { subtotal, totalTax, grandTotalRaw, roundOff, finalTotal: Math.round(grandTotalRaw) };
    };
    const totals = calculateTotals();

    // ── Submit ─────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!customerName.trim()) { toast.error('Customer name is required'); return; }
        if (items.length === 0) { toast.error('Add at least one item'); return; }
        setSubmitting(true);
        try {
            const data = {
                customer: selectedCustomer?._id,
                customerName, customerPhone,
                customerAddress: selectedCustomer?.address,
                customerGstin: selectedCustomer?.gstin,
                proformaDate, status, taxType,
                items: items.map(i => ({
                    itemType: i.itemType,
                    product: i.product || undefined,
                    batch: i.batch || undefined,
                    serviceName: i.serviceName || '',
                    sacCode: i.sacCode || '',
                    quantity: i.quantity,
                    unit: i.unit,
                    sellingPrice: i.sellingPrice,
                    gstRate: i.gstRate,
                    mrp: i.mrp,
                })),
                subtotal: totals.subtotal,
                totalTax: totals.totalTax,
                totalCGST: taxType === 'CGST_SGST' ? totals.totalTax / 2 : 0,
                totalSGST: taxType === 'CGST_SGST' ? totals.totalTax / 2 : 0,
                totalIGST: taxType === 'IGST' ? totals.totalTax : 0,
                discount,
                roundOff: totals.roundOff,
                grandTotal: totals.finalTotal,
                // Transport
                ...(shopSettings?.pfEnableTransport && {
                    transportMode: transport.mode,
                    transportDocNumber: transport.docNumber,
                    transportDocDate: transport.docDate || undefined,
                    vehicleNumber: transport.vehicleNumber,
                    approxDist: transport.approxDist,
                    pos: transport.pos,
                    supplyDate: transport.supplyDate || undefined,
                    transporterId: transport.transporterId,
                    transporterName: transport.transporterName,
                }),
                // PO
                ...(shopSettings?.pfEnablePurchaseOrders && {
                    poNumber: po.poNumber,
                    poDate: po.poDate || undefined,
                }),
                // Additional
                ...(shopSettings?.pfEnableAdditionalDetails && {
                    deliveryNote: additionalDetails.deliveryNote,
                    referenceNo: additionalDetails.referenceNo,
                    otherReferences: additionalDetails.otherReferences,
                    termsOfDelivery: additionalDetails.termsOfDelivery,
                    destination: additionalDetails.destination,
                }),
                notes, terms,
            };
            const pf = await proformaInvoicesAPI.create(data);
            toast.success('Proforma invoice created!');
            router.push(`/dashboard/porforma-invoice/${pf._id}`);
        } catch (err) { toast.error(err.message || 'Failed to create proforma invoice'); }
        finally { setSubmitting(false); }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(customerSearchTerm))
    );

    const enableProduct = shopSettings?.enableProduct !== false;
    const enableService = shopSettings?.enableService === true;

    if (loading || !user) return null;

    const AccordionHeader = ({ icon: Icon, title, open, onToggle, color = 'text-blue-600' }) => (
        <button type="button" onClick={onToggle}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-sm font-semibold text-gray-800">{title}</span>
            </div>
            {open ? <HiChevronUp className="w-4 h-4 text-gray-400" /> : <HiChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
    );

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Create Proforma Invoice</h1>
                    <p className="mt-1 text-sm text-gray-500">Generate a proforma invoice for your customer</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 text-black">

                    {/* ── Customer Card ─────────────────────────────────────────── */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-violet-500 rounded-full inline-block" />
                            Customer Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Customer search dropdown */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select Customer</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative customer-dropdown-container">
                                        <div onClick={() => setIsCustomerDropdownOpen(v => !v)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white cursor-pointer flex items-center justify-between hover:border-violet-400 transition-colors">
                                            <span className={selectedCustomer ? 'text-gray-900 text-sm font-medium' : 'text-gray-400 text-sm'}>
                                                {selectedCustomer ? `${selectedCustomer.name} — ${selectedCustomer.phone}` : 'Search or select customer...'}
                                            </span>
                                            {selectedCustomer
                                                ? <button type="button" onClick={e => { e.stopPropagation(); handleCustomerChange(''); }}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"><HiX className="w-4 h-4" /></button>
                                                : <HiSearch className="w-4 h-4 text-gray-400" />
                                            }
                                        </div>
                                        {isCustomerDropdownOpen && (
                                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-hidden">
                                                <div className="p-2 border-b border-gray-100">
                                                    <div className="relative">
                                                        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                        <input autoFocus type="text" placeholder="Search by name or phone..."
                                                            value={customerSearchTerm} onChange={e => setCustomerSearchTerm(e.target.value)}
                                                            onClick={e => e.stopPropagation()}
                                                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent" />
                                                    </div>
                                                </div>
                                                <div className="max-h-56 overflow-y-auto">
                                                    {filteredCustomers.map(c => (
                                                        <div key={c._id} onClick={() => handleCustomerChange(c._id)}
                                                            className="px-4 py-2.5 hover:bg-violet-50 cursor-pointer border-t border-gray-50 transition-colors">
                                                            <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                                                            <div className="text-xs text-gray-500">{c.phone}</div>
                                                        </div>
                                                    ))}
                                                    {filteredCustomers.length === 0 && (
                                                        <div className="px-4 py-4 text-sm text-gray-400 text-center">No customers found</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => setShowCustomerModal(true)}
                                        className="px-4 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors flex items-center gap-1.5 text-sm font-medium">
                                        <HiPlus className="w-4 h-4" /> New
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Customer Name *</label>
                                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required
                                    placeholder="Customer name"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all" />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phone</label>
                                <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                                    placeholder="Phone number"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all" />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Proforma Date *</label>
                                <input type="date" value={proformaDate} onChange={e => setProformaDate(e.target.value)} required
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all" />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
                                <select value={status} onChange={e => setStatus(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all bg-white">
                                    <option value="DRAFT">Draft</option>
                                    <option value="SENT">Sent</option>
                                    <option value="CONFIRMED">Confirmed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tax Type</label>
                                <div className="flex rounded-xl overflow-hidden border border-gray-300 max-w-xs">
                                    {[
                                        { value: 'CGST_SGST', label: 'CGST + SGST' },
                                        { value: 'IGST', label: 'IGST' },
                                        { value: 'NONE', label: 'No Tax' },
                                    ].map(opt => (
                                        <button key={opt.value} type="button" onClick={() => setTaxType(opt.value)}
                                            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${taxType === opt.value ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Items Card ────────────────────────────────────────────── */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-1.5 h-5 bg-blue-500 rounded-full inline-block" />
                                Items
                            </h2>
                            <div className="flex gap-2">
                                {enableProduct && (
                                    <button type="button" onClick={addProductItem}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                                        <HiCube className="w-4 h-4" /> Add Product
                                    </button>
                                )}
                                {enableService && (
                                    <button type="button" onClick={addServiceItem}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors shadow-sm">
                                        <HiLightningBolt className="w-4 h-4" /> Add Service
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Column headers */}
                        {items.length > 0 && (
                            <div className="hidden md:grid grid-cols-12 gap-2 px-3 mb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                <div className="col-span-4">Item</div>
                                <div className="col-span-1 text-center">Qty</div>
                                <div className="col-span-1 text-center">Unit</div>
                                <div className="col-span-2 text-center">Price (₹)</div>
                                <div className="col-span-2 text-center">GST %</div>
                                <div className="col-span-1 text-right">Total</div>
                                <div className="col-span-1" />
                            </div>
                        )}

                        <div className="space-y-3">
                            {items.map((item, index) => {
                                const isService = item.itemType === 'service';
                                const lineTotal = item.quantity * item.sellingPrice * (1 + (taxType === 'NONE' ? 0 : item.gstRate) / 100);
                                const bothEnabled = enableProduct && enableService;

                                return (
                                    <div key={index}
                                        className={`rounded-xl border p-4 space-y-3 ${isService ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>

                                        {bothEnabled && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-400 font-medium">Type:</span>
                                                {[
                                                    { type: 'product', label: 'Product', Icon: HiCube, active: 'bg-blue-600 text-white', inactive: 'bg-white text-gray-500 border border-gray-200 hover:bg-blue-50' },
                                                    { type: 'service', label: 'Service', Icon: HiLightningBolt, active: 'bg-purple-600 text-white', inactive: 'bg-white text-gray-500 border border-gray-200 hover:bg-purple-50' },
                                                ].map(({ type, label, Icon, active, inactive }) => (
                                                    <button key={type} type="button"
                                                        onClick={() => { const u = [...items]; u[index].itemType = type; setItems(u); }}
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors shadow-sm ${item.itemType === type ? active : inactive}`}>
                                                        <Icon className="w-3 h-3" /> {label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-12 gap-2 items-center">
                                            <div className="col-span-12 md:col-span-4">
                                                {isService ? (
                                                    <input type="text" placeholder="Service name…" value={item.serviceName || ''}
                                                        onChange={e => { const u = [...items]; u[index].serviceName = e.target.value; setItems(u); }}
                                                        className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                                                ) : (
                                                    <select value={item.selectedBatch || ''} onChange={e => updateItem(index, 'product', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white">
                                                        <option value="">Select Product / Batch</option>
                                                        {products.map(b => (
                                                            <option key={b.batchId} value={JSON.stringify(b)}>{b.label}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>

                                            <div className="col-span-3 md:col-span-1">
                                                <input type="number" min="1" placeholder="Qty" value={item.quantity}
                                                    onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                                                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-violet-400 focus:border-transparent" />
                                            </div>

                                            <div className="col-span-3 md:col-span-1">
                                                <select value={item.unit || 'PCS'} onChange={e => updateItem(index, 'unit', e.target.value)}
                                                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent bg-white">
                                                    {['PCS', 'NOS', 'KG', 'GM', 'LTR', 'ML', 'MTR', 'BOX', 'PKT', 'SET'].map(u => (
                                                        <option key={u} value={u}>{u}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="col-span-3 md:col-span-2">
                                                <div className="relative">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                                    <input type="number" step="0.01" min="0" placeholder="0.00" value={item.sellingPrice}
                                                        onChange={e => updateItem(index, 'sellingPrice', Number(e.target.value))}
                                                        className="w-full pl-6 pr-2 py-2 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-violet-400 focus:border-transparent" />
                                                </div>
                                            </div>

                                            <div className="col-span-3 md:col-span-2">
                                                <select value={item.gstRate} onChange={e => updateItem(index, 'gstRate', Number(e.target.value))}
                                                    disabled={taxType === 'NONE'}
                                                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent bg-white disabled:bg-gray-100 disabled:text-gray-400">
                                                    {[0, 0.25, 3, 5, 12, 18, 28, 40].map(r => <option key={r} value={r}>{r}%</option>)}
                                                </select>
                                            </div>

                                            <div className="col-span-10 md:col-span-1 text-right">
                                                <span className="text-sm font-bold text-gray-800">₹{lineTotal.toFixed(2)}</span>
                                            </div>

                                            <div className="col-span-2 md:col-span-1 flex justify-end">
                                                <button type="button" onClick={() => removeItem(index)}
                                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                    <HiX className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {isService && (
                                            <div className="w-48">
                                                <input type="text" placeholder="SAC Code (optional)" value={item.sacCode || ''}
                                                    onChange={e => { const u = [...items]; u[index].sacCode = e.target.value; setItems(u); }}
                                                    className="w-full px-3 py-1.5 border border-purple-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {items.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-14 border-2 border-dashed border-gray-200 rounded-xl">
                                    <div className="flex gap-3 mb-3">
                                        {enableProduct && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-600 border border-blue-200">
                                                <HiCube className="w-3.5 h-3.5" /> Product
                                            </span>
                                        )}
                                        {enableProduct && enableService && <span className="text-gray-300 text-sm self-center">or</span>}
                                        {enableService && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-600 border border-purple-200">
                                                <HiLightningBolt className="w-3.5 h-3.5" /> Service
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400">Use the buttons above to add items</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Totals Card ───────────────────────────────────────────── */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-green-500 rounded-full inline-block" />
                            Summary
                        </h2>
                        <div className="max-w-sm ml-auto space-y-2.5">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Subtotal</span>
                                <span className="font-semibold">₹{totals.subtotal.toFixed(2)}</span>
                            </div>
                            {taxType !== 'NONE' && totals.totalTax > 0 && (
                                <>
                                    {taxType === 'CGST_SGST' && <>
                                        <div className="flex justify-between text-sm text-gray-400">
                                            <span>CGST</span><span>₹{(totals.totalTax / 2).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-gray-400">
                                            <span>SGST</span><span>₹{(totals.totalTax / 2).toFixed(2)}</span>
                                        </div>
                                    </>}
                                    {taxType === 'IGST' && (
                                        <div className="flex justify-between text-sm text-gray-400">
                                            <span>IGST</span><span>₹{totals.totalTax.toFixed(2)}</span>
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Discount</span>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                    <input type="number" min="0" step="0.01" value={discount}
                                        onChange={e => setDiscount(Number(e.target.value))}
                                        className="w-32 pl-6 pr-3 py-1.5 border border-gray-300 rounded-lg text-right text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent" />
                                </div>
                            </div>
                            <div className="flex justify-between text-sm text-gray-400">
                                <span>Round Off</span>
                                <span>{totals.roundOff >= 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}</span>
                            </div>
                            <div className="pt-3 border-t-2 border-gray-200">
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Grand Total</span>
                                    <span className="text-violet-600">₹{totals.finalTotal.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Optional Sections ─────────────────────────────────────── */}
                    {(shopSettings?.pfEnableTransport || shopSettings?.pfEnablePurchaseOrders || shopSettings?.pfEnableAdditionalDetails) && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 divide-y divide-gray-100">

                            {shopSettings?.pfEnableTransport && (
                                <div>
                                    <AccordionHeader icon={HiTruck} title="Transportation Details" open={showTransport}
                                        onToggle={() => setShowTransport(v => !v)} color="text-blue-500" />
                                    {showTransport && (
                                        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[
                                                { label: 'Mode of Transport', key: 'mode', placeholder: 'Road / Air / Rail / Ship' },
                                                { label: 'LR / RR / AWB No.', key: 'docNumber', placeholder: 'Document number' },
                                                { label: 'Vehicle Number', key: 'vehicleNumber', placeholder: 'e.g. KA01AB1234' },
                                                { label: 'Approx Distance (km)', key: 'approxDist', placeholder: 'e.g. 150' },
                                                { label: 'Place of Supply', key: 'pos', placeholder: 'State / City' },
                                                { label: 'Transporter ID', key: 'transporterId', placeholder: 'GSTIN of transporter' },
                                                { label: 'Transporter Name', key: 'transporterName', placeholder: 'Transporter company name' },
                                            ].map(({ label, key, placeholder }) => (
                                                <div key={key}>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
                                                    <input type="text" placeholder={placeholder} value={transport[key]}
                                                        onChange={e => setTransport(p => ({ ...p, [key]: e.target.value }))}
                                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
                                                </div>
                                            ))}
                                            {[{ label: 'Document Date', key: 'docDate' }, { label: 'Supply Date', key: 'supplyDate' }].map(({ label, key }) => (
                                                <div key={key}>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
                                                    <input type="date" value={transport[key]}
                                                        onChange={e => setTransport(p => ({ ...p, [key]: e.target.value }))}
                                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {shopSettings?.pfEnablePurchaseOrders && (
                                <div>
                                    <AccordionHeader icon={HiClipboardList} title="Purchase Order Details" open={showPO}
                                        onToggle={() => setShowPO(v => !v)} color="text-yellow-500" />
                                    {showPO && (
                                        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">PO Number</label>
                                                <input type="text" placeholder="Purchase order number" value={po.poNumber}
                                                    onChange={e => setPo(p => ({ ...p, poNumber: e.target.value }))}
                                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">PO Date</label>
                                                <input type="date" value={po.poDate}
                                                    onChange={e => setPo(p => ({ ...p, poDate: e.target.value }))}
                                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {shopSettings?.pfEnableAdditionalDetails && (
                                <div>
                                    <AccordionHeader icon={HiInformationCircle} title="Additional Details" open={showAdditional}
                                        onToggle={() => setShowAdditional(v => !v)} color="text-gray-400" />
                                    {showAdditional && (
                                        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[
                                                { label: 'Delivery Note', key: 'deliveryNote', placeholder: 'Delivery note reference' },
                                                { label: 'Reference No.', key: 'referenceNo', placeholder: 'Internal reference' },
                                                { label: 'Other References', key: 'otherReferences', placeholder: 'Any other references' },
                                                { label: 'Terms of Delivery', key: 'termsOfDelivery', placeholder: 'e.g. Ex-Works, CIF' },
                                                { label: 'Destination', key: 'destination', placeholder: 'Final destination' },
                                            ].map(({ label, key, placeholder }) => (
                                                <div key={key}>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
                                                    <input type="text" placeholder={placeholder} value={additionalDetails[key]}
                                                        onChange={e => setAdditionalDetails(p => ({ ...p, [key]: e.target.value }))}
                                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Notes & Terms ─────────────────────────────────────────── */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-gray-400 rounded-full inline-block" />
                            Notes &amp; Terms
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                                    placeholder="Any additional notes for the customer..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Terms &amp; Conditions</label>
                                <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3}
                                    placeholder="Payment terms, advance payment details..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none" />
                            </div>
                        </div>
                    </div>

                    {/* ── Actions ───────────────────────────────────────────────── */}
                    <div className="flex justify-end gap-3 pb-6">
                        <button type="button" onClick={() => router.back()}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting}
                            className="px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            {submitting ? 'Creating...' : 'Create Proforma Invoice'}
                        </button>
                    </div>
                </form>
            </div>

            {/* ── New Customer Modal ────────────────────────────────────────── */}
            <Modal isOpen={showCustomerModal} onClose={() => { setShowCustomerModal(false); setCustomerFormErrors({}); }}
                title="Add New Customer" size="max-w-2xl">
                <form onSubmit={handleCreateCustomer} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black">
                        {[['name', 'Customer Name', true, 'text'], ['phone', 'Phone', true, 'tel'],
                        ['email', 'Email', false, 'email'], ['gstin', 'GSTIN', false, 'text']].map(([field, label, req, type]) => (
                            <div key={field}>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                    {label}{req && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                <input type={type} name={field} value={customerFormData[field]}
                                    onChange={e => { setCustomerFormData({ ...customerFormData, [field]: e.target.value }); if (customerFormErrors[field]) setCustomerFormErrors({ ...customerFormErrors, [field]: '' }); }}
                                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:border-transparent ${customerFormErrors[field] ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-violet-400'}`} />
                                {customerFormErrors[field] && (
                                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                        <HiExclamation className="w-3.5 h-3.5" /> {customerFormErrors[field]}
                                    </p>
                                )}
                            </div>
                        ))}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Address</label>
                            <textarea name="address" value={customerFormData.address} rows={2}
                                onChange={e => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none" />
                        </div>
                        {['city', 'state', 'pincode'].map(f => (
                            <div key={f}>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 capitalize">{f}</label>
                                <input type="text" name={f} value={customerFormData[f]}
                                    onChange={e => setCustomerFormData({ ...customerFormData, [f]: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent" />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                        <button type="button" onClick={() => { setShowCustomerModal(false); setCustomerFormErrors({}); }}
                            className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={savingCustomer}
                            className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
                            {savingCustomer ? 'Saving...' : 'Add Customer'}
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
}
