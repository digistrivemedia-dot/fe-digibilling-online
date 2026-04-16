'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import PageLoader from '@/components/PageLoader';
import Modal from '@/components/Modal';
import { productsAPI, customersAPI, deliveryChallansAPI } from '@/utils/api';
import { useDeliveryChallansStore } from '@/store/useDeliveryChallansStore';
import { HiPlus, HiSearch, HiX, HiExclamation } from 'react-icons/hi';

export default function EditDeliveryChallan() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { invalidate: invalidateChallans } = useDeliveryChallansStore();
    const params = useParams();
    const toast = useToast();

    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [items, setItems] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [challanDate, setChallanDate] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [transporterName, setTransporterName] = useState('');
    const [transporterDoc, setTransporterDoc] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [notes, setNotes] = useState('');
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
            const [batchesData, customersData, cd] = await Promise.all([
                productsAPI.getBatchesForInvoice(),
                customersAPI.getAll(),
                deliveryChallansAPI.getOne(params.id),
            ]);
            setProducts(batchesData);
            setCustomers(customersData);
            setCustomerName(cd.customerName || '');
            setCustomerPhone(cd.customerPhone || '');
            setChallanDate(cd.challanDate ? new Date(cd.challanDate).toISOString().split('T')[0] : '');
            setVehicleNumber(cd.vehicleNumber || '');
            setTransporterName(cd.transporterName || '');
            setTransporterDoc(cd.transporterDoc || '');
            setDeliveryAddress(cd.deliveryAddress || '');
            setNotes(cd.notes || '');
            setStatus(cd.status || 'DRAFT');
            setItems((cd.items || []).map(item => ({
                product: item.product?._id || item.product || '',
                batch: item.batch?._id || item.batch || '',
                selectedBatch: '',
                productName: item.productName,
                quantity: item.quantity || 1,
                unit: item.unit || 'PCS',
                description: item.description || '',
            })));
            if (cd.customer) {
                const matched = customersData.find(c => c._id === (cd.customer?._id || cd.customer));
                if (matched) setSelectedCustomer(matched);
            }
        } catch (e) { toast.error(e.message || 'Failed to load challan'); }
        finally { setLoadingData(false); }
    };

    const handleCustomerChange = (customerId) => {
        if (customerId) {
            const c = customers.find(c => c._id === customerId);
            setSelectedCustomer(c); setCustomerName(c.name); setCustomerPhone(c.phone);
            setDeliveryAddress(c.address || '');
        } else { setSelectedCustomer(null); setCustomerName(''); setCustomerPhone(''); setDeliveryAddress(''); }
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
            const cds = await customersAPI.getAll();
            setCustomers(cds); setSelectedCustomer(nc); setCustomerName(nc.name); setCustomerPhone(nc.phone);
            setShowCustomerModal(false);
            setCustomerFormData({ name: '', phone: '', email: '', gstin: '', address: '', city: '', state: '', pincode: '' });
            setCustomerFormErrors({});
            toast.success('Customer added!');
        } catch (e) { toast.error(e.message || 'Failed'); }
        finally { setSavingCustomer(false); }
    };

    const addItem = () => setItems([...items, { product: '', batch: '', selectedBatch: '', quantity: 1, unit: 'PCS', description: '' }]);
    const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
    const updateItem = (index, field, value) => {
        const updated = [...items];
        if (field === 'product' && value) {
            try {
                const batch = JSON.parse(value);
                updated[index] = { ...updated[index], selectedBatch: value, batch: batch.batchId, product: batch.productId, productName: batch.label };
            } catch { updated[index][field] = value; }
        } else { updated[index][field] = value; }
        setItems(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (items.length === 0) { toast.error('Add at least one item'); return; }
        if (!customerName.trim()) { toast.error('Customer name is required'); return; }
        setSubmitting(true);
        try {
            await deliveryChallansAPI.update(params.id, {
                customer: selectedCustomer?._id, customerName, customerPhone,
                customerAddress: selectedCustomer?.address, customerGstin: selectedCustomer?.gstin,
                challanDate, vehicleNumber, transporterName, transporterDoc,
                deliveryAddress, notes, status, items,
            });
            toast.success('Delivery challan updated!');
            invalidateChallans();
            router.push(`/dashboard/delivery-challan/${params.id}`);
        } catch (e) { toast.error(e.message || 'Failed to update'); }
        finally { setSubmitting(false); }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || c.phone.includes(customerSearchTerm)
    );

    if (authLoading || !user) return null;
    if (loadingData) return <DashboardLayout><PageLoader /></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Edit Delivery Challan</h1>
                    <p className="mt-1 text-sm text-gray-600">Update the delivery challan details</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 text-black">
                    {/* Customer & Dispatch */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer & Dispatch Details</h2>
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
                                                        <input type="text" placeholder="Search..." value={customerSearchTerm}
                                                            onChange={(e) => setCustomerSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()}
                                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" autoFocus />
                                                    </div>
                                                </div>
                                                <div className="max-h-60 overflow-y-auto">
                                                    {filteredCustomers.map(c => (
                                                        <div key={c._id} onClick={() => handleCustomerChange(c._id)}
                                                            className="px-4 py-2 hover:bg-teal-50 cursor-pointer border-t border-gray-100">
                                                            <div className="font-medium text-gray-900">{c.name}</div>
                                                            <div className="text-sm text-gray-500">{c.phone}</div>
                                                        </div>
                                                    ))}
                                                    {filteredCustomers.length === 0 && <div className="px-4 py-3 text-sm text-gray-500 text-center">No customers found</div>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => setShowCustomerModal(true)} className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                                        <HiPlus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                                <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Challan Date *</label>
                                <input type="date" value={challanDate} onChange={(e) => setChallanDate(e.target.value)} required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                            </div>
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Number</label>
                                <input type="text" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Transporter Name</label>
                                <input type="text" value={transporterName} onChange={(e) => setTransporterName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Transport Doc / LR Number</label>
                                <input type="text" value={transporterDoc} onChange={(e) => setTransporterDoc(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                                <textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none" />
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Items to Dispatch</h2>
                            <button type="button" onClick={addItem} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">+ Add Item</button>
                        </div>
                        <div className="space-y-4">
                            {items.length > 0 && (
                                <div className="flex gap-4 px-4 text-xs font-semibold text-gray-600 uppercase">
                                    <div className="flex-1">Product</div><div className="w-24">Qty</div><div className="w-24">Unit</div><div className="flex-1">Description</div><div className="w-10"></div>
                                </div>
                            )}
                            {items.map((item, index) => (
                                <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                        <select value={item.selectedBatch || ''} onChange={(e) => updateItem(index, 'product', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500">
                                            <option value="">{item.productName || 'Select Product'}</option>
                                            {products.map(b => <option key={b.batchId} value={JSON.stringify(b)}>{b.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                    </div>
                                    <div className="w-24">
                                        <select value={item.unit || 'PCS'} onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                            {['ANN', 'BAG', 'BAL', 'BDL', 'BKL', 'BOTTLE', 'BOU', 'BOX', 'BTL', 'BUN', 'CAN', 'CBM', 'CCM', 'CMS', 'CTN', 'DAY', 'DAYS', 'DOZ', 'DRM', 'GGK', 'GM', 'GMS', 'GRS', 'GYD', 'HRS', 'JOB', 'KG', 'KGS', 'KLR', 'KME', 'LITRE', 'LTR', 'ML', 'MLT', 'MON', 'MONTHS', 'MTR', 'NOS', 'OTH', 'PAC', 'PCS', 'PKT', 'PRS', 'QTL', 'ROL', 'SET', 'SQF', 'SQM', 'SQY', 'STRIP', 'TBS', 'TGM', 'THD', 'TON', 'TUB', 'UGS', 'UNT', 'YDS'].map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <input type="text" value={item.description || ''} onChange={(e) => updateItem(index, 'description', e.target.value)}
                                            placeholder="Optional description"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                    </div>
                                    <button type="button" onClick={() => removeItem(index)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg">✕</button>
                                </div>
                            ))}
                            {items.length === 0 && <div className="text-center py-8 text-gray-500">No items. Click "Add Item" to start.</div>}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none" />
                    </div>

                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={() => router.push(`/dashboard/delivery-challan/${params.id}`)}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={submitting || items.length === 0}
                            className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
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
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 ${customerFormErrors[field] ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'}`} />
                                {customerFormErrors[field] && <p className="text-sm text-red-600 flex items-center mt-1"><HiExclamation className="w-4 h-4 mr-1" />{customerFormErrors[field]}</p>}
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
