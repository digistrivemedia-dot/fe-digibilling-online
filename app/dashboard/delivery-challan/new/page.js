'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { productsAPI, customersAPI, deliveryChallansAPI, shopAPI, servicesAPI } from '@/utils/api';
import { HiPlus, HiSearch, HiX, HiExclamation, HiCube, HiLightningBolt } from 'react-icons/hi';

export default function NewDeliveryChallan() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const toast = useToast();

    const [products, setProducts] = useState([]);
    const [services, setServices] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [shopSettings, setShopSettings] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [items, setItems] = useState([]);
    const [taxType, setTaxType] = useState('CGST_SGST');
    const [discount, setDiscount] = useState(0);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState('DRAFT');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Transport accordion
    const [showTransport, setShowTransport] = useState(false);
    const [transport, setTransport] = useState({
        mode: '', docNumber: '', docDate: '', vehicleNumber: '',
        approxDist: '', pos: '', supplyDate: '', transporterId: '', transporterName: '',
    });

    // Purchase Order accordion
    const [showPO, setShowPO] = useState(false);
    const [po, setPo] = useState({ poNumber: '', poDate: '' });

    // Additional Details accordion
    const [showAdditional, setShowAdditional] = useState(false);
    const [additionalDetails, setAdditionalDetails] = useState({
        eWayBillNumber: '', deliveryNote: '', referenceNo: '',
        otherReferences: '', termsOfDelivery: '', destination: '',
    });

    // Customer dropdown
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

    // Customer modal
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [savingCustomer, setSavingCustomer] = useState(false);
    const [customerFormErrors, setCustomerFormErrors] = useState({});
    const [customerFormData, setCustomerFormData] = useState({
        name: '', phone: '', email: '', gstin: '', address: '', city: '', state: '', pincode: '',
    });

    useEffect(() => {
        if (!loading && !user) router.push('/login');
        else if (user) loadData();
    }, [user, loading]);

    useEffect(() => {
        const handler = (e) => {
            if (isCustomerDropdownOpen && !e.target.closest('.customer-dropdown-container')) {
                setIsCustomerDropdownOpen(false);
                setCustomerSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isCustomerDropdownOpen]);

    const loadData = async () => {
        try {
            const [batchesData, customersData, shopData, servicesData] = await Promise.all([
                productsAPI.getBatchesForInvoice(),
                customersAPI.getAll(),
                shopAPI.get(),
                servicesAPI.getAll().catch(() => []),
            ]);
            setProducts(batchesData);
            setCustomers(customersData);
            setShopSettings(shopData);
            setServices(servicesData);
            if (shopData?.defaultTaxType) setTaxType(shopData.defaultTaxType);
        } catch (e) { console.error(e); }
    };

    const handleCustomerChange = (customerId) => {
        if (customerId) {
            const c = customers.find(c => c._id === customerId);
            setSelectedCustomer(c);
            setCustomerName(c.name);
            setCustomerPhone(c.phone);
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
            const nc = await customersAPI.create(customerFormData);
            const cd = await customersAPI.getAll();
            setCustomers(cd);
            setSelectedCustomer(nc);
            setCustomerName(nc.name);
            setCustomerPhone(nc.phone);
            setShowCustomerModal(false);
            setCustomerFormData({ name: '', phone: '', email: '', gstin: '', address: '', city: '', state: '', pincode: '' });
            setCustomerFormErrors({});
            toast.success('Customer added!');
        } catch (e) { toast.error(e.message || 'Failed'); }
        finally { setSavingCustomer(false); }
    };

    const addItem = () => setItems([...items, {
        itemType: 'product', product: '', batch: '', selectedBatch: '',
        quantity: 1, unit: 'PCS', sellingPrice: 0, gstRate: 0, description: '',
    }]);

    const addServiceItem = () => setItems([...items, {
        itemType: 'service', serviceName: '', sacCode: '', quantity: 1,
        unit: 'NOS', sellingPrice: 0, gstRate: 0, description: '',
    }]);

    const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

    const updateItem = (index, field, value) => {
        const updated = [...items];
        if (field === 'product' && value) {
            try {
                const batch = JSON.parse(value);
                updated[index] = {
                    ...updated[index],
                    selectedBatch: value,
                    batch: batch.batchId,
                    product: batch.productId,
                    productName: batch.label,
                    sellingPrice: batch.sellingPrice,
                    gstRate: batch.gstRate,
                    mrp: batch.mrp,
                };
            } catch { updated[index][field] = value; }
        } else {
            updated[index][field] = value;
        }
        setItems(updated);
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + item.quantity * item.sellingPrice, 0);

        // Apply discount BEFORE GST calculation
        const subtotalAfterDiscount = subtotal - discount;

        // Skip all tax calculations for Composition Scheme
        const totalTax = shopSettings?.gstScheme === 'COMPOSITION' ? 0
            : taxType === 'NONE' ? 0
            : (() => {
                // Calculate discount ratio for proportional distribution
                const discountRatio = subtotal > 0 ? subtotalAfterDiscount / subtotal : 1;
                return items.reduce((sum, item) => {
                    const itemTotal = item.quantity * item.sellingPrice;
                    const itemAfterDiscount = itemTotal * discountRatio;
                    return sum + (itemAfterDiscount * item.gstRate) / 100;
                }, 0);
            })();

        const grandTotal = subtotalAfterDiscount + totalTax;
        const roundOff = Math.round(grandTotal) - grandTotal;
        const finalTotal = Math.round(grandTotal);
        return { subtotal, totalTax, grandTotal, roundOff, finalTotal };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (items.length === 0) { toast.error('Add at least one item'); return; }
        if (!customerName.trim()) { toast.error('Customer name is required'); return; }
        const emptyItem = items.findIndex(i => i.itemType !== 'service' && !i.product);
        if (emptyItem !== -1) { toast.error(`Select a product for item #${emptyItem + 1}`); return; }

        // Validation: Check if discount is greater than subtotal
        const totals = calculateTotals();
        if (discount > totals.subtotal) {
            toast.error(`Discount (₹${discount.toFixed(2)}) cannot be greater than Subtotal (₹${totals.subtotal.toFixed(2)})`);
            return;
        }

        // Validation: Check if grand total is negative
        if (totals.finalTotal < 0) {
            toast.error('Total cannot be negative. Please reduce the discount amount.');
            return;
        }

        setSubmitting(true);
        try {
            const totals = calculateTotals();
            const challan = await deliveryChallansAPI.create({
                customer: selectedCustomer?._id,
                customerName, customerPhone,
                customerAddress: selectedCustomer?.address,
                customerGstin: selectedCustomer?.gstin,
                challanDate, status, items, taxType, discount,
                subtotal: totals.subtotal,
                totalTax: totals.totalTax,
                grandTotal: totals.finalTotal,
                notes,
                // Transport
                transportMode: transport.mode,
                transportDocNumber: transport.docNumber,
                transportDocDate: transport.docDate || undefined,
                vehicleNumber: transport.vehicleNumber,
                approxDist: transport.approxDist ? Number(transport.approxDist) : undefined,
                pos: transport.pos,
                supplyDate: transport.supplyDate || undefined,
                transporterId: transport.transporterId,
                transporterName: transport.transporterName,
                // PO
                poNumber: po.poNumber,
                poDate: po.poDate || undefined,
                // Additional
                eWayBillNumber: additionalDetails.eWayBillNumber || undefined,
                deliveryNote: additionalDetails.deliveryNote || undefined,
                referenceNo: additionalDetails.referenceNo || undefined,
                otherReferences: additionalDetails.otherReferences || undefined,
                termsOfDelivery: additionalDetails.termsOfDelivery || undefined,
                destination: additionalDetails.destination || undefined,
            });
            toast.success('Delivery challan created!');
            router.push(`/dashboard/delivery-challan/${challan._id}`);
        } catch (e) { toast.error(e.message || 'Failed to create'); }
        finally { setSubmitting(false); }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        c.phone.includes(customerSearchTerm)
    );

    const totals = calculateTotals();

    if (loading || !user) return null;

    // Helper: accordion chevron
    const Chevron = ({ open }) => (
        <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
    );

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Create Delivery Challan</h1>
                    <p className="mt-1 text-sm text-gray-600">Generate a delivery challan for dispatch</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 text-black">

                    {/* ── Customer Details ── */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Customer Search Dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer (Optional)</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative customer-dropdown-container">
                                        <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer focus-within:ring-2 focus-within:ring-teal-500"
                                            onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}>
                                            <div className="flex items-center justify-between">
                                                <span className={selectedCustomer ? 'text-gray-900' : 'text-gray-500'}>
                                                    {selectedCustomer ? `${selectedCustomer.name} – ${selectedCustomer.phone}` : 'Select customer...'}
                                                </span>
                                                {selectedCustomer && (
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleCustomerChange(''); }}>
                                                        <HiX className="w-4 h-4 text-gray-400" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {isCustomerDropdownOpen && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
                                                <div className="p-2 border-b border-gray-200">
                                                    <div className="relative">
                                                        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                        <input type="text" placeholder="Search by name or phone..." value={customerSearchTerm}
                                                            onChange={(e) => setCustomerSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()}
                                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" autoFocus />
                                                    </div>
                                                </div>
                                                <div className="max-h-60 overflow-y-auto">
                                                    <div onClick={() => handleCustomerChange('')}
                                                        className="px-4 py-2 hover:bg-teal-50 cursor-pointer text-gray-700">
                                                        No customer (Walk-in)
                                                    </div>
                                                    {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                                                        <div key={c._id} onClick={() => handleCustomerChange(c._id)}
                                                            className="px-4 py-2 hover:bg-teal-50 cursor-pointer border-t border-gray-100">
                                                            <div className="font-medium text-gray-900">{c.name}</div>
                                                            <div className="text-sm text-gray-500">{c.phone}</div>
                                                        </div>
                                                    )) : (
                                                        <div className="px-4 py-3 text-sm text-gray-500 text-center">No customers found</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => setShowCustomerModal(true)}
                                        className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700" title="Add New Customer">
                                        <HiPlus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Customer Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                                <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                            </div>

                            {/* Challan Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Challan Date *</label>
                                <input type="date" value={challanDate} onChange={(e) => setChallanDate(e.target.value)} required
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select value={status} onChange={(e) => setStatus(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500">
                                    <option value="DRAFT">Draft</option>
                                    <option value="DISPATCHED">Dispatched</option>
                                    <option value="DELIVERED">Delivered</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>

                            {/* Tax Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tax Type</label>
                                <select value={taxType} onChange={(e) => setTaxType(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500">
                                    <option value="CGST_SGST">CGST + SGST (Same State)</option>
                                    <option value="IGST">IGST (Interstate)</option>
                                    <option value="NONE">No Tax</option>
                                </select>
                            </div>

                        </div>
                    </div>

                    {/* ── Items ── */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Items to Dispatch</h2>
                            <div className="flex items-center gap-2">
                                {shopSettings?.enableProduct !== false && (
                                    <button type="button" onClick={addItem}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
                                        <HiCube className="w-4 h-4" /> Add Product
                                    </button>
                                )}
                                {shopSettings?.enableService && (
                                    <button type="button" onClick={addServiceItem}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                                        <HiLightningBolt className="w-4 h-4" /> Add Service
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Column headers */}
                            {items.length > 0 && (
                                <div className="flex gap-4 px-4 text-xs font-semibold text-gray-600 uppercase">
                                    <div className="flex-1">Item</div>
                                    <div className="w-20">Qty</div>
                                    <div className="w-24">Unit</div>
                                    <div className="w-28">Price</div>
                                    {shopSettings?.gstScheme === 'REGULAR' && <div className="w-24">GST %</div>}
                                    <div className="w-32">Total (incl. GST)</div>
                                    <div className="w-10" />
                                </div>
                            )}

                            {items.map((item, index) => {
                                const bothEnabled = shopSettings?.enableProduct !== false && shopSettings?.enableService;
                                const isService = item.itemType === 'service';
                                const isComposition = shopSettings?.gstScheme === 'COMPOSITION';
                                const effectiveGstRate = (isComposition) ? 0 : item.gstRate;
                                const lineTotal = item.quantity * item.sellingPrice * (1 + effectiveGstRate / 100);

                                return (
                                    <div key={index} className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-200 gap-3">

                                        {/* Type switcher — only when both product & service enabled */}
                                        {bothEnabled && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-400 font-medium mr-1">Type:</span>
                                                <button type="button"
                                                    onClick={() => { const u = [...items]; u[index].itemType = 'product'; setItems(u); }}
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors
                            ${!isService ? 'bg-teal-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                                    <HiCube className="w-3 h-3" /> Product
                                                </button>
                                                <button type="button"
                                                    onClick={() => { const u = [...items]; u[index].itemType = 'service'; setItems(u); }}
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors
                            ${isService ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                                    <HiLightningBolt className="w-3 h-3" /> Service
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex gap-4 items-start">
                                            {/* Item selector */}
                                            <div className="flex-1">
                                                {isService ? (
                                                    (() => {
                                                        const filtered = services.filter(s =>
                                                            s.name.toLowerCase().includes((item.serviceName || '').toLowerCase())
                                                        );
                                                        const showDrop = item._svcDropOpen && filtered.length > 0;
                                                        return (
                                                            <div className="relative">
                                                                <input type="text" placeholder="Type or pick a service…" value={item.serviceName || ''}
                                                                    onFocus={() => { const u = [...items]; u[index]._svcDropOpen = true; setItems(u); }}
                                                                    onBlur={() => setTimeout(() => { const u = [...items]; u[index]._svcDropOpen = false; setItems(u); }, 150)}
                                                                    onChange={e => {
                                                                        const u = [...items];
                                                                        u[index].serviceName = e.target.value;
                                                                        u[index]._svcDropOpen = true;
                                                                        u[index].serviceId = '';
                                                                        setItems(u);
                                                                    }}
                                                                    className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                                                                {showDrop && (
                                                                    <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border border-purple-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                                                                        {filtered.map(s => (
                                                                            <li key={s._id}
                                                                                onMouseDown={() => {
                                                                                    const u = [...items];
                                                                                    u[index].serviceName = s.name;
                                                                                    u[index].serviceId = s._id;
                                                                                    u[index].sellingPrice = s.rate;
                                                                                    u[index].gstRate = s.gstRate;
                                                                                    u[index].sacCode = s.sacCode || '';
                                                                                    u[index].unit = s.unit || 'NOS';
                                                                                    u[index]._svcDropOpen = false;
                                                                                    setItems(u);
                                                                                }}
                                                                                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-purple-50 text-sm">
                                                                                <span className="font-medium text-gray-800">{s.name}</span>
                                                                                <span className="text-xs text-gray-400 ml-2">
                                                                                    ₹{s.rate}{shopSettings?.gstScheme === 'REGULAR' && ` · ${s.gstRate}% GST`}
                                                                                </span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                        );
                                                    })()
                                                ) : (
                                                    <select value={item.selectedBatch || ''}
                                                        onChange={(e) => updateItem(index, 'product', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500">
                                                        <option value="">Select Product</option>
                                                        {products.map(b => <option key={b.batchId} value={JSON.stringify(b)}>{b.label}</option>)}
                                                    </select>
                                                )}
                                                {/* Description */}
                                                <input type="text" placeholder="Description (optional)"
                                                    value={item.description || ''}
                                                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                    className="w-full mt-2 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 focus:ring-1 focus:ring-teal-400" />
                                            </div>

                                            {/* Qty */}
                                            <div className="w-20">
                                                <input type="number" min="1" placeholder="Qty"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                            </div>

                                            {/* Unit */}
                                            <div className="w-24">
                                                <select value={item.unit || 'PCS'} onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                                    {['ANN', 'BAG', 'BAL', 'BDL', 'BKL', 'BOTTLE', 'BOU', 'BOX', 'BTL', 'BUN', 'CAN', 'CBM', 'CCM', 'CMS', 'CTN', 'DAY', 'DAYS', 'DOZ', 'DRM', 'GGK', 'GM', 'GMS', 'GRS', 'GYD', 'HRS', 'JOB', 'KG', 'KGS', 'KLR', 'KME', 'LITRE', 'LTR', 'ML', 'MLT', 'MON', 'MONTHS', 'MTR', 'NOS', 'OTH', 'PAC', 'PCS', 'PKT', 'PRS', 'QTL', 'ROL', 'SET', 'SQF', 'SQM', 'SQY', 'STRIP', 'TBS', 'TGM', 'THD', 'TON', 'TUB', 'UGS', 'UNT', 'YDS'].map(u =>
                                                        <option key={u} value={u}>{u}</option>
                                                    )}
                                                </select>
                                            </div>

                                            {/* Price */}
                                            <div className="w-28">
                                                <input type="number" step="0.01" placeholder="Price"
                                                    value={item.sellingPrice}
                                                    onChange={(e) => updateItem(index, 'sellingPrice', Number(e.target.value))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                            </div>

                                            {/* GST % */}
                                            {shopSettings?.gstScheme === 'REGULAR' && (
                                                <div className="w-24">
                                                    <select value={item.gstRate}
                                                        onChange={(e) => updateItem(index, 'gstRate', Number(e.target.value))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                                        {[0, 0.25, 3, 5, 12, 18, 28, 40].map(r => <option key={r} value={r}>{r}%</option>)}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Line total */}
                                            <div className="w-32 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
                                                ₹{lineTotal.toFixed(2)}
                                            </div>

                                            <button type="button" onClick={() => removeItem(index)}
                                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg">✕</button>
                                        </div>
                                    </div>
                                );
                            })}

                            {items.length === 0 && (
                                <div className="text-center py-10 text-gray-400">
                                    <p className="text-sm">Use the buttons above to add items to the challan</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Totals Summary ── */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Challan Summary</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Discount:</span>
                                <input type="number" min="0" step="0.01" value={discount}
                                    max={totals.subtotal}
                                    onChange={(e) => {
                                        const value = Number(e.target.value);
                                        if (value > totals.subtotal) {
                                            toast.error(`Discount cannot exceed subtotal of ₹${totals.subtotal.toFixed(2)}`);
                                            setDiscount(totals.subtotal);
                                        } else {
                                            setDiscount(value);
                                        }
                                    }}
                                    className="w-32 px-3 py-1 border border-gray-300 rounded-lg text-right" placeholder="0.00" />
                            </div>
                            {totals.totalTax > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">{taxType === 'IGST' ? 'IGST' : 'CGST + SGST'}:</span>
                                    <span className="font-medium">₹{totals.totalTax.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Round Off:</span>
                                <span className="font-medium">₹{totals.roundOff.toFixed(2)}</span>
                            </div>
                            <div className="pt-3 border-t border-gray-200">
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Grand Total:</span>
                                    <span className="text-teal-600">₹{totals.finalTotal.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Transportation Details Accordion ── */}
                    {shopSettings?.enableTransport && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <button type="button" onClick={() => setShowTransport(p => !p)}
                                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-semibold text-gray-900">Transportation Details</span>
                                    <span className="text-xs text-gray-400 font-normal">(Optional — for E-Way Bill)</span>
                                </div>
                                <Chevron open={showTransport} />
                            </button>

                            {showTransport && (() => {
                                const docLabels = {
                                    ROAD: { num: 'LR Number', date: 'LR Date' },
                                    RAIL: { num: 'RR Number', date: 'RR Date' },
                                    AIR: { num: 'AWB Number', date: 'AWB Date' },
                                    SHIP_ROAD: { num: 'Loading Number', date: 'Loading Date' },
                                };
                                const labels = docLabels[transport.mode] || null;
                                return (
                                    <div className="px-6 pb-6 border-t border-gray-100">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Transportation Mode</label>
                                                <select value={transport.mode}
                                                    onChange={(e) => setTransport({ ...transport, mode: e.target.value, docNumber: '', docDate: '' })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500">
                                                    <option value="">Select Mode</option>
                                                    <option value="NONE">None</option>
                                                    <option value="ROAD">Road</option>
                                                    <option value="RAIL">Rail</option>
                                                    <option value="AIR">Air</option>
                                                    <option value="SHIP_ROAD">Ship / Road</option>
                                                </select>
                                            </div>

                                            {labels && (
                                                <>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">{labels.num}</label>
                                                        <input type="text" value={transport.docNumber}
                                                            onChange={(e) => setTransport({ ...transport, docNumber: e.target.value })}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-black"
                                                            placeholder={`Enter ${labels.num}`} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">{labels.date}</label>
                                                        <input type="date" value={transport.docDate}
                                                            onChange={(e) => setTransport({ ...transport, docDate: e.target.value })}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-black" />
                                                    </div>
                                                </>
                                            )}

                                            {!['AIR', 'RAIL'].includes(transport.mode) && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Number</label>
                                                    <input type="text" value={transport.vehicleNumber}
                                                        onChange={(e) => setTransport({ ...transport, vehicleNumber: e.target.value })}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-black"
                                                        placeholder="e.g. TN12AB1234" />
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Approx Distance (KM)</label>
                                                <input type="number" min="0" value={transport.approxDist}
                                                    onChange={(e) => setTransport({ ...transport, approxDist: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-black"
                                                    placeholder="e.g. 250" />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Place of Supply (POS)</label>
                                                <input type="text" value={transport.pos}
                                                    onChange={(e) => setTransport({ ...transport, pos: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-black"
                                                    placeholder="e.g. Tamil Nadu" />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Supply</label>
                                                <input type="date" value={transport.supplyDate}
                                                    onChange={(e) => setTransport({ ...transport, supplyDate: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-black" />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Transporter ID</label>
                                                <input type="text" value={transport.transporterId}
                                                    onChange={(e) => setTransport({ ...transport, transporterId: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-black"
                                                    placeholder="e.g. 27AABCU9603R1Z1" />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Transporter Name</label>
                                                <input type="text" value={transport.transporterName}
                                                    onChange={(e) => setTransport({ ...transport, transporterName: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-black"
                                                    placeholder="e.g. Fast Logistics Pvt Ltd" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* ── Purchase Order Accordion ── */}
                    {shopSettings?.enablePurchaseOrders && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <button type="button" onClick={() => setShowPO(p => !p)}
                                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-semibold text-gray-900">Purchase Order Details</span>
                                    <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                                </div>
                                <Chevron open={showPO} />
                            </button>
                            {showPO && (
                                <div className="px-6 pb-6 border-t border-gray-100">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">PO Number</label>
                                            <input type="text" value={po.poNumber}
                                                onChange={(e) => setPo({ ...po, poNumber: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-black"
                                                placeholder="e.g. PO-2024-001" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">PO Date</label>
                                            <input type="date" value={po.poDate}
                                                onChange={(e) => setPo({ ...po, poDate: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-black" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Additional Details Accordion ── */}
                    {shopSettings?.enableAdditionalDetails && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <button type="button" onClick={() => setShowAdditional(p => !p)}
                                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-semibold text-gray-900">Additional Details</span>
                                    <span className="text-xs text-gray-400 font-normal">(Optional — for E-Way Bill / Tally)</span>
                                </div>
                                <Chevron open={showAdditional} />
                            </button>
                            {showAdditional && (
                                <div className="px-6 pb-6 border-t border-gray-100">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        {[
                                            ['eWayBillNumber', 'E-Way Bill Number', 'e.g. 112345678912'],
                                            ['deliveryNote', 'Delivery Note', ''],
                                            ['referenceNo', 'Reference No.', ''],
                                            ['otherReferences', 'Other References', ''],
                                            ['termsOfDelivery', 'Terms of Delivery', ''],
                                            ['destination', 'Destination', ''],
                                        ].map(([field, label, placeholder]) => (
                                            <div key={field}>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                                                <input type="text" value={additionalDetails[field]}
                                                    onChange={(e) => setAdditionalDetails({ ...additionalDetails, [field]: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-black"
                                                    placeholder={placeholder} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Notes ── */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
                            placeholder="Additional notes for this delivery..." />
                    </div>

                    {/* ── Actions ── */}
                    <div className="flex justify-end gap-4 pb-10">
                        <button type="button" onClick={() => router.back()}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting || items.length === 0}
                            className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            {submitting ? 'Creating...' : 'Create Delivery Challan'}
                        </button>
                    </div>
                </form>
            </div>

            {/* ── Add Customer Modal ── */}
            <Modal isOpen={showCustomerModal} onClose={() => { setShowCustomerModal(false); setCustomerFormErrors({}); }}
                title="Add New Customer" size="max-w-2xl">
                <form onSubmit={handleCreateCustomer} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black">
                        {[
                            ['name', 'Customer Name', true, 'text'],
                            ['phone', 'Phone', true, 'tel'],
                            ['email', 'Email', false, 'email'],
                            ['gstin', 'GSTIN', false, 'text'],
                        ].map(([field, label, required, type]) => (
                            <div key={field}>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {label}{required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                <input type={type} value={customerFormData[field]}
                                    onChange={(e) => {
                                        setCustomerFormData({ ...customerFormData, [field]: e.target.value });
                                        if (customerFormErrors[field]) setCustomerFormErrors({ ...customerFormErrors, [field]: '' });
                                    }}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 ${customerFormErrors[field] ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'}`} />
                                {customerFormErrors[field] && (
                                    <p className="text-sm text-red-600 flex items-center mt-1">
                                        <HiExclamation className="w-4 h-4 mr-1" />{customerFormErrors[field]}
                                    </p>
                                )}
                            </div>
                        ))}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                            <textarea value={customerFormData.address} rows={2}
                                onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                        </div>
                        {['city', 'state', 'pincode'].map(field => (
                            <div key={field}>
                                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">{field}</label>
                                <input type="text" value={customerFormData[field]}
                                    onChange={(e) => setCustomerFormData({ ...customerFormData, [field]: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <button type="button" onClick={() => { setShowCustomerModal(false); setCustomerFormErrors({}); }}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={savingCustomer}
                            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">
                            {savingCustomer ? 'Saving...' : 'Add Customer'}
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
}
