'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import PageLoader from '@/components/PageLoader';
import Modal from '@/components/Modal';
import { productsAPI, customersAPI, quotationsAPI, shopAPI } from '@/utils/api';
import { calculateInvoiceTotals, calculateItemWithDiscount } from '@/utils/calculations';
import {
  HiPlus, HiSearch, HiX, HiExclamation,
  HiCube, HiLightningBolt,
} from 'react-icons/hi';

export default function EditQuotation() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const toast = useToast();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [shopSettings, setShopSettings] = useState(null);

  // ── Customer ──────────────────────────────────────────────────────────────
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

  // ── Document fields ────────────────────────────────────────────────────────
  const [items, setItems] = useState([]);
  const [taxType, setTaxType] = useState('CGST_SGST');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [quotationDate, setQuotationDate] = useState('');
  const [validityDate, setValidityDate] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    else if (user) loadData();
  }, [user, authLoading]);

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
      const [batchesData, customersData, quotationData, shopData] = await Promise.all([
        productsAPI.getBatchesForInvoice(),
        customersAPI.getAll(),
        quotationsAPI.getOne(params.id),
        shopAPI.get(),
      ]);

      setProducts(batchesData);
      setCustomers(customersData);
      setShopSettings(shopData);

      // Pre-fill from existing quotation
      setCustomerName(quotationData.customerName || '');
      setCustomerPhone(quotationData.customerPhone || '');
      setTaxType(quotationData.taxType || 'CGST_SGST');
      setNotes(quotationData.notes || '');
      setTerms(quotationData.terms || '');
      setStatus(quotationData.status || 'DRAFT');
      setQuotationDate(
        quotationData.quotationDate
          ? new Date(quotationData.quotationDate).toISOString().split('T')[0]
          : ''
      );
      setValidityDate(
        quotationData.validityDate
          ? new Date(quotationData.validityDate).toISOString().split('T')[0]
          : ''
      );

      // Map existing items — preserve itemType, service fields, and product fields
      const mappedItems = (quotationData.items || []).map((item) => {
        if (item.itemType === 'service') {
          return {
            itemType: 'service',
            serviceName: item.serviceName || '',
            sacCode: item.sacCode || '',
            quantity: item.quantity || 1,
            unit: item.unit || 'NOS',
            sellingPrice: item.sellingPrice || 0,
            discountAmount: item.discountAmount || 0,
            gstRate: item.gstRate ?? 18,
          };
        }
        return {
          itemType: 'product',
          product: item.product?._id || item.product || '',
          batch: item.batch?._id || item.batch || '',
          selectedBatch: '',
          productName: item.productName || '',
          quantity: item.quantity || 1,
          unit: item.unit || 'PCS',
          sellingPrice: item.sellingPrice || 0,
          discountAmount: item.discountAmount || 0,
          gstRate: item.gstRate ?? 12,
          mrp: item.mrp || '',
          availableQuantity: null,
        };
      });
      setItems(mappedItems);

      // Match selected customer
      if (quotationData.customer) {
        const matched = customersData.find(
          (c) => c._id === (quotationData.customer?._id || quotationData.customer)
        );
        if (matched) setSelectedCustomer(matched);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load quotation');
    } finally {
      setLoadingData(false);
    }
  };

  // ── Customer helpers ───────────────────────────────────────────────────────
  const handleCustomerChange = (id) => {
    if (id) {
      const c = customers.find((c) => c._id === id);
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
      const newCustomer = await customersAPI.create(customerFormData);
      const all = await customersAPI.getAll();
      setCustomers(all);
      setSelectedCustomer(newCustomer);
      setCustomerName(newCustomer.name);
      setCustomerPhone(newCustomer.phone || '');
      setShowCustomerModal(false);
      setCustomerFormData({ name: '', phone: '', email: '', gstin: '', address: '', city: '', state: '', pincode: '' });
      setCustomerFormErrors({});
      toast.success('Customer added!');
    } catch (err) { toast.error(err.message || 'Failed to add customer'); }
    finally { setSavingCustomer(false); }
  };

  // ── Item helpers ───────────────────────────────────────────────────────────
  const addProductItem = () => setItems((p) => [...p, {
    itemType: 'product', product: '', batch: '', selectedBatch: '',
    quantity: 1, unit: 'PCS', sellingPrice: 0, discountAmount: 0, gstRate: 12, mrp: '',
  }]);

  const addServiceItem = () => setItems((p) => [...p, {
    itemType: 'service', serviceName: '', sacCode: '',
    quantity: 1, unit: 'NOS', sellingPrice: 0, discountAmount: 0, gstRate: 18,
  }]);

  const removeItem = (i) => setItems((p) => p.filter((_, idx) => idx !== i));

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
        updated[index].availableQuantity = batch.availableQuantity;
      } catch { updated[index][field] = value; }
    } else {
      updated[index][field] = value;
    }
    setItems(updated);
  };

  // ── Totals ─────────────────────────────────────────────────────────────────
  const calculateTotals = () => {
    const result = calculateInvoiceTotals(items, 0, taxType, 0, shopSettings);
    return {
      subtotal: result.subtotal,
      totalDiscount: result.totalDiscount,
      totalTax: result.totalTax,
      grandTotalRaw: result.grandTotal,
      roundOff: result.roundOff,
      finalTotal: result.finalTotal
    };
  };
  const totals = calculateTotals();

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) { toast.error('Customer name is required'); return; }
    if (items.length === 0) { toast.error('Add at least one item'); return; }

    setSubmitting(true);
    try {
      await quotationsAPI.update(params.id, {
        customer: selectedCustomer?._id,
        customerName,
        customerPhone,
        customerAddress: selectedCustomer?.address,
        customerGstin: selectedCustomer?.gstin,
        quotationDate,
        validityDate,
        status,
        taxType,
        items: items.map((i) => ({
          itemType: i.itemType,
          product: i.product || undefined,
          batch: i.batch || undefined,
          productName: i.productName || '',
          batchNo: i.batchNo || '',
          serviceName: i.serviceName || '',
          sacCode: i.sacCode || '',
          quantity: i.quantity,
          unit: i.unit,
          sellingPrice: i.sellingPrice,
          discountAmount: i.discountAmount || 0,
          gstRate: i.gstRate,
          mrp: i.mrp,
        })),
        subtotal: totals.subtotal,
        totalTax: totals.totalTax,
        totalCGST: taxType === 'CGST_SGST' ? totals.totalTax / 2 : 0,
        totalSGST: taxType === 'CGST_SGST' ? totals.totalTax / 2 : 0,
        totalIGST: taxType === 'IGST' ? totals.totalTax : 0,
        discount: totals.totalDiscount || 0,
        roundOff: totals.roundOff,
        grandTotal: totals.finalTotal,
        notes,
        terms,
      });
      toast.success('Quotation updated!');
      router.push(`/dashboard/quotation/${params.id}`);
    } catch (error) {
      toast.error(error.message || 'Failed to update quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(customerSearchTerm))
  );

  const enableProduct = shopSettings?.enableProduct !== false;
  const enableService = shopSettings?.enableService === true;

  if (authLoading || !user) return null;
  if (loadingData) return <DashboardLayout><PageLoader /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Quotation</h1>
          <p className="mt-1 text-sm text-gray-500">Update the quotation details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-black">

          {/* ── Customer Card ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-orange-500 rounded-full inline-block" />
              Customer Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Customer search dropdown */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select Customer</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative customer-dropdown-container">
                    <div onClick={() => setIsCustomerDropdownOpen((v) => !v)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white cursor-pointer flex items-center justify-between hover:border-orange-400 transition-colors">
                      <span className={selectedCustomer ? 'text-gray-900 text-sm font-medium' : 'text-gray-400 text-sm'}>
                        {selectedCustomer ? `${selectedCustomer.name} — ${selectedCustomer.phone}` : 'Search or select customer...'}
                      </span>
                      {selectedCustomer
                        ? <button type="button" onClick={(e) => { e.stopPropagation(); handleCustomerChange(''); }}
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
                              value={customerSearchTerm} onChange={(e) => setCustomerSearchTerm(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                          </div>
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                          {filteredCustomers.map((c) => (
                            <div key={c._id} onClick={() => handleCustomerChange(c._id)}
                              className="px-4 py-2.5 hover:bg-orange-50 cursor-pointer border-t border-gray-50 transition-colors">
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
                    className="px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors flex items-center gap-1.5 text-sm font-medium">
                    <HiPlus className="w-4 h-4" /> New
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Customer Name *</label>
                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required
                  placeholder="Customer name"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phone</label>
                <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quotation Date *</label>
                <input type="date" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)} required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Valid Until</label>
                <input type="date" value={validityDate} onChange={(e) => setValidityDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all bg-white">
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tax Type</label>
                <div className="flex rounded-xl overflow-hidden border border-gray-300">
                  {[
                    { value: 'CGST_SGST', label: 'CGST + SGST' },
                    { value: 'IGST', label: 'IGST' },
                    { value: 'NONE', label: 'No Tax' },
                  ].map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setTaxType(opt.value)}
                      className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${taxType === opt.value ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Items Card ────────────────────────────────────────────────── */}
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
                <div className="col-span-3">Item</div>
                <div className="col-span-1 text-center">Qty</div>
                <div className="col-span-1 text-center">Unit</div>
                <div className="col-span-2 text-center">Discount (₹)</div>
                <div className="col-span-2 text-center">Price (₹)</div>
                <div className="col-span-1 text-center">GST %</div>
                <div className="col-span-1 text-right">Total</div>
                <div className="col-span-1" />
              </div>
            )}

            <div className="space-y-3">
              {items.map((item, index) => {
                const isService = item.itemType === 'service';
                const bothEnabled = enableProduct && enableService;
                const lineTotal = calculateItemWithDiscount(
                  { ...item, gstRate: taxType === 'NONE' ? 0 : item.gstRate },
                  shopSettings
                ).itemTotal;

                return (
                  <div key={index}
                    className={`rounded-xl border p-4 space-y-3 ${isService ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>

                    {/* Type switcher — only when both are enabled */}
                    {bothEnabled && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-medium">Type:</span>
                        {[
                          { type: 'product', label: 'Product', Icon: HiCube, cls: 'blue' },
                          { type: 'service', label: 'Service', Icon: HiLightningBolt, cls: 'purple' },
                        ].map(({ type, label, Icon, cls }) => (
                          <button key={type} type="button"
                            onClick={() => { const u = [...items]; u[index].itemType = type; setItems(u); }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors
                              ${item.itemType === type
                                ? `bg-${cls}-600 text-white shadow-sm`
                                : `bg-white text-gray-500 border border-gray-200 hover:bg-${cls}-50`}`}>
                            <Icon className="w-3 h-3" /> {label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Fields row */}
                    <div className="grid grid-cols-12 gap-2 items-center">

                      {/* Item selector */}
                      <div className="col-span-12 md:col-span-3">
                        {isService ? (
                          <input type="text" placeholder="Service name…" value={item.serviceName || ''}
                            onChange={(e) => { const u = [...items]; u[index].serviceName = e.target.value; setItems(u); }}
                            className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                        ) : (
                          <select value={item.selectedBatch || ''} onChange={(e) => updateItem(index, 'product', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white">
                            <option value="">{item.productName || 'Select Product / Batch'}</option>
                            {products.map((b) => (
                              <option key={b.batchId} value={JSON.stringify(b)}>{b.label}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Qty */}
                      <div className="col-span-3 md:col-span-1">
                        <input type="number" min="1" placeholder="Qty" value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                      </div>

                      {/* Unit */}
                      <div className="col-span-3 md:col-span-1">
                        <select value={item.unit || 'PCS'} onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white">
                          {['ANN', 'BAG', 'BAL', 'BDL', 'BKL', 'BOTTLE', 'BOU', 'BOX', 'BTL', 'BUN', 'CAN', 'CBM', 'CCM', 'CMS', 'CTN', 'DAY', 'DAYS', 'DOZ', 'DRM', 'GGK', 'GM', 'GMS', 'GRS', 'GYD', 'HRS', 'JOB', 'KG', 'KGS', 'KLR', 'KME', 'LITRE', 'LTR', 'ML', 'MLT', 'MON', 'MONTHS', 'MTR', 'NOS', 'OTH', 'PAC', 'PCS', 'PKT', 'PRS', 'QTL', 'ROL', 'SET', 'SQF', 'SQM', 'SQY', 'STRIP', 'TBS', 'TGM', 'THD', 'TON', 'TUB', 'UGS', 'UNT', 'YDS'].map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      {/* Discount (₹) */}
                      <div className="col-span-3 md:col-span-2">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                          <input
                            type="number" min="0" step="0.01" placeholder="0.00"
                            value={item.discountAmount || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const maxDiscount = item.quantity * item.sellingPrice;
                              if (val > maxDiscount) {
                                toast.error(`Discount cannot exceed item total of ₹${maxDiscount.toFixed(2)}`);
                                updateItem(index, 'discountAmount', maxDiscount);
                              } else {
                                updateItem(index, 'discountAmount', val);
                              }
                            }}
                            className="w-full pl-6 pr-2 py-2 border border-emerald-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                            title="Item Discount (₹)"
                          />
                        </div>
                      </div>

                      {/* Price */}
                      <div className="col-span-3 md:col-span-2">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                          <input type="number" step="0.01" min="0" placeholder="0.00" value={item.sellingPrice}
                            onChange={(e) => updateItem(index, 'sellingPrice', Number(e.target.value))}
                            className="w-full pl-6 pr-2 py-2 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                        </div>
                      </div>

                      {/* GST */}
                      <div className="col-span-3 md:col-span-1">
                        <select value={item.gstRate} onChange={(e) => updateItem(index, 'gstRate', Number(e.target.value))}
                          disabled={taxType === 'NONE'}
                          className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white disabled:bg-gray-100 disabled:text-gray-400">
                          {[0, 0.25, 3, 5, 12, 18, 28, 40].map((r) => <option key={r} value={r}>{r}%</option>)}
                        </select>
                      </div>

                      {/* Line total */}
                      <div className="col-span-10 md:col-span-1 text-right">
                        <span className="text-sm font-bold text-gray-800">₹{lineTotal.toFixed(2)}</span>
                      </div>

                      {/* Remove */}
                      <div className="col-span-2 md:col-span-1 flex justify-end">
                        <button type="button" onClick={() => removeItem(index)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <HiX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* SAC Code for service */}
                    {isService && (
                      <div className="w-48">
                        <input type="text" placeholder="SAC Code (optional)" value={item.sacCode || ''}
                          onChange={(e) => { const u = [...items]; u[index].sacCode = e.target.value; setItems(u); }}
                          className="w-full px-3 py-1.5 border border-purple-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Empty state */}
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

          {/* ── Totals Card ───────────────────────────────────────────────── */}
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
              {totals.totalDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Discount</span>
                  <span className="text-emerald-600 font-medium">-₹{totals.totalDiscount.toFixed(2)}</span>
                </div>
              )}
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
              <div className="flex justify-between text-sm text-gray-400">
                <span>Round Off</span>
                <span>{totals.roundOff >= 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t-2 border-gray-200">
                <div className="flex justify-between text-lg font-bold">
                  <span>Grand Total</span>
                  <span className="text-orange-600">₹{totals.finalTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Notes & Terms ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-gray-400 rounded-full inline-block" />
              Notes &amp; Terms
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  placeholder="Any additional notes for the customer..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Terms &amp; Conditions</label>
                <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3}
                  placeholder="Payment terms, delivery conditions, validity..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none" />
              </div>
            </div>
          </div>

          {/* ── Actions ───────────────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pb-6">
            <button type="button" onClick={() => router.push(`/dashboard/quotation/${params.id}`)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-semibold hover:from-orange-700 hover:to-red-700 shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* ── New Customer Modal ─────────────────────────────────────────────── */}
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
                  onChange={(e) => { setCustomerFormData({ ...customerFormData, [field]: e.target.value }); if (customerFormErrors[field]) setCustomerFormErrors({ ...customerFormErrors, [field]: '' }); }}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:border-transparent ${customerFormErrors[field] ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-orange-400'}`} />
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
                onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none" />
            </div>
            {['city', 'state', 'pincode'].map((f) => (
              <div key={f}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 capitalize">{f}</label>
                <input type="text" name={f} value={customerFormData[f]}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, [f]: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={() => { setShowCustomerModal(false); setCustomerFormErrors({}); }}
              className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={savingCustomer}
              className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50">
              {savingCustomer ? 'Saving...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
