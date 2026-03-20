'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { productsAPI, customersAPI, invoicesAPI, shopAPI } from '@/utils/api';
import { HiPlus, HiSearch, HiX, HiExclamation, HiExclamationCircle } from 'react-icons/hi';

export default function EditInvoice() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [shopSettings, setShopSettings] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [taxType, setTaxType] = useState('CGST_SGST');
  const [cessRate, setCessRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentDetails, setPaymentDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('Cash Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(true);
  const [invoiceError, setInvoiceError] = useState(null);
  const [originalInvoice, setOriginalInvoice] = useState(null);

  // Customer dropdown search state
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Customer modal state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerFormErrors, setCustomerFormErrors] = useState({});
  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      loadData();
    }
  }, [user, authLoading, router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isCustomerDropdownOpen && !event.target.closest('.customer-dropdown-container')) {
        setIsCustomerDropdownOpen(false);
        setCustomerSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCustomerDropdownOpen]);

  const loadData = async () => {
    try {
      const [productsData, customersData, shopData] = await Promise.all([
        productsAPI.getAll(),
        customersAPI.getAll(),
        shopAPI.get(),
      ]);
      setProducts(productsData);
      setCustomers(customersData);
      setShopSettings(shopData);

      // Load the invoice data
      await loadInvoice(customersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    }
  };

  const loadInvoice = async (customersData) => {
    try {
      setLoadingInvoice(true);
      const invoice = await invoicesAPI.getOne(params.id);
      setOriginalInvoice(invoice);

      // Pre-fill all form fields
      setInvoiceDate(invoice.invoiceDate ? invoice.invoiceDate.split('T')[0] : new Date().toISOString().split('T')[0]);
      setCustomerName(invoice.customerName || 'Cash Customer');
      setCustomerPhone(invoice.customerPhone || '');
      setTaxType(invoice.taxType || 'CGST_SGST');
      setCessRate(invoice.cessRate || 0);
      setDiscount(invoice.discount || 0);
      setPaymentStatus(invoice.paymentStatus || 'PAID');
      setPaymentMethod(invoice.paymentMethod || 'CASH');
      setPaidAmount(invoice.paidAmount || 0);
      setPaymentDetails(invoice.paymentDetails || '');
      setNotes(invoice.notes || '');

      // Set selected customer if exists
      if (invoice.customer) {
        const customerId = invoice.customer._id || invoice.customer;
        const customer = customersData.find((c) => c._id === customerId);
        if (customer) {
          setSelectedCustomer(customer);
        }
      }

      // Pre-fill invoice items (include batch info to preserve existing batches)
      if (invoice.items && invoice.items.length > 0) {
        const itemsWithData = invoice.items.map((item) => ({
          product: item.product?._id || item.product,
          batch: item.batch?._id || item.batch,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
          discount: item.discount || 0,
          gstRate: item.gstRate,
          cessRate: item.cessRate || 0,
          returnedQuantity: item.returnedQuantity || 0,
        }));
        setInvoiceItems(itemsWithData);
      }

      setLoadingInvoice(false);
    } catch (error) {
      console.error('Error loading invoice:', error);
      setInvoiceError(error.message || 'Failed to load invoice');
      setLoadingInvoice(false);
      toast.error('Invoice not found');
    }
  };

  const handleCustomerFormChange = (e) => {
    const { name, value } = e.target;
    setCustomerFormData({ ...customerFormData, [name]: value });
    // Clear error for this field
    if (customerFormErrors[name]) {
      setCustomerFormErrors({ ...customerFormErrors, [name]: '' });
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();

    // Validate name and phone are provided
    const newErrors = {};
    if (!customerFormData.name || customerFormData.name.trim() === '') {
      newErrors.name = 'Customer Name is required';
    }
    if (!customerFormData.phone || customerFormData.phone.trim() === '') {
      newErrors.phone = 'Phone Number is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setCustomerFormErrors(newErrors);
      toast.error('Please fill all required fields');
      return;
    }

    setSavingCustomer(true);

    try {
      const newCustomer = await customersAPI.create(customerFormData);
      // Reload customers list
      const customersData = await customersAPI.getAll();
      setCustomers(customersData);
      // Auto-select the newly created customer
      setSelectedCustomer(newCustomer);
      setCustomerName(newCustomer.name);
      setCustomerPhone(newCustomer.phone);
      // Close modal and reset form
      setShowCustomerModal(false);
      setCustomerFormData({
        name: '',
        phone: '',
        email: '',
        gstin: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
      });
      setCustomerFormErrors({});
      toast.success('Customer added successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to add customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  const addItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      { product: '', batch: '', quantity: 1, sellingPrice: 0, discount: 0, gstRate: 12, cessRate: 0, returnedQuantity: 0 },
    ]);
  };

  const removeItem = (index) => {
    // Ensure at least 1 item remains
    if (invoiceItems.length <= 1) {
      toast.error('At least one item must remain in the invoice');
      return;
    }
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...invoiceItems];
    updated[index][field] = value;

    // Auto-fill product details
    if (field === 'product') {
      const product = products.find((p) => p._id === value);
      if (product) {
        updated[index].sellingPrice = product.sellingPrice;
        updated[index].gstRate = product.gstRate;
        // Clear batch when product changes (old batch won't match new product)
        updated[index].batch = '';
        updated[index].returnedQuantity = 0; // New product won't have returns
      }
    }

    setInvoiceItems(updated);
  };

  const handleCustomerChange = (customerId) => {
    if (customerId) {
      const customer = customers.find((c) => c._id === customerId);
      setSelectedCustomer(customer);
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone);
    } else {
      setSelectedCustomer(null);
      setCustomerName('Cash Customer');
      setCustomerPhone('');
    }
    setIsCustomerDropdownOpen(false);
    setCustomerSearchTerm('');
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.phone.includes(customerSearchTerm)
  );

  const calculateTotals = () => {
    // Calculate subtotal (after item-level discounts)
    const subtotal = invoiceItems.reduce((sum, item) => {
      const itemTotal = item.quantity * item.sellingPrice;
      const itemDiscount = (itemTotal * (item.discount || 0)) / 100;
      return sum + (itemTotal - itemDiscount);
    }, 0);

    let totalTax = 0;
    let totalCess = 0;

    if (taxType === 'CESS') {
      // When tax type is CESS, apply the manual CESS rate to all items
      totalCess = (subtotal * cessRate) / 100;
    } else {
      // For CGST_SGST and IGST, calculate GST on taxable amount (after item discount)
      totalTax = invoiceItems.reduce((sum, item) => {
        const itemTotal = item.quantity * item.sellingPrice;
        const itemDiscount = (itemTotal * (item.discount || 0)) / 100;
        const taxableAmount = itemTotal - itemDiscount;
        return sum + (taxableAmount * item.gstRate) / 100;
      }, 0);

      // Also add item-level CESS if any
      totalCess = invoiceItems.reduce((sum, item) => {
        const itemTotal = item.quantity * item.sellingPrice;
        const itemDiscount = (itemTotal * (item.discount || 0)) / 100;
        const taxableAmount = itemTotal - itemDiscount;
        return sum + (taxableAmount * (item.cessRate || 0)) / 100;
      }, 0);
    }

    const grandTotal = subtotal + totalTax + totalCess - discount;
    const roundOff = Math.round(grandTotal) - grandTotal;
    const finalTotal = Math.round(grandTotal);

    return { subtotal, totalTax, totalCess, grandTotal, roundOff, finalTotal };
  };

  const validateStockAvailability = () => {
    for (let i = 0; i < invoiceItems.length; i++) {
      const item = invoiceItems[i];
      const product = products.find((p) => p._id === item.product);

      if (!product) {
        toast.error(`Product not found for item #${i + 1}`);
        return false;
      }

      // Calculate the stock difference accounting for returned quantities
      const originalItem = originalInvoice.items.find((origItem) =>
        (origItem.product?._id || origItem.product) === item.product &&
        (!item.batch || (origItem.batch?._id || origItem.batch) === item.batch)
      );

      if (originalItem) {
        // Existing item - check if quantity increased
        const returnedQty = originalItem.returnedQuantity || 0;
        const originalNetQuantity = originalItem.quantity - returnedQty;
        const additionalQuantity = item.quantity - originalNetQuantity;

        // Only validate if quantity is increasing
        if (additionalQuantity > 0) {
          if (product.stockQuantity < additionalQuantity) {
            toast.error(
              `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Additional needed: ${additionalQuantity}`
            );
            return false;
          }
        }
      } else {
        // New item - validate full quantity
        if (product.stockQuantity < item.quantity) {
          toast.error(
            `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`
          );
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation: Check if at least one item exists
    if (invoiceItems.length === 0) {
      toast.error('Please add at least one item to the invoice');
      return;
    }

    // Validation: Check if all items have products selected
    const emptyProductIndex = invoiceItems.findIndex(item => !item.product || item.product === '');
    if (emptyProductIndex !== -1) {
      toast.error(`Please select a product for item #${emptyProductIndex + 1}`);
      return;
    }

    // Validation: Check if all items have quantity > 0
    const zeroQuantityIndex = invoiceItems.findIndex(item => !item.quantity || item.quantity <= 0);
    if (zeroQuantityIndex !== -1) {
      toast.error(`Please enter quantity for item #${zeroQuantityIndex + 1}`);
      return;
    }

    // Validate stock availability
    if (!validateStockAvailability()) {
      return;
    }

    setSubmitting(true);

    try {
      const totals = calculateTotals();

      const invoiceData = {
        customer: selectedCustomer?._id,
        customerName,
        customerPhone,
        customerAddress: selectedCustomer?.address,
        customerGstin: selectedCustomer?.gstin,
        invoiceDate,
        items: invoiceItems.map(item => ({
          product: item.product,
          batch: item.batch || undefined,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
          discount: item.discount || 0,
          gstRate: item.gstRate,
          cessRate: item.cessRate || 0,
        })),
        taxType,
        cessRate: taxType === 'CESS' ? cessRate : 0,
        discount,
        paymentStatus,
        paymentMethod,
        paidAmount: paymentStatus === 'PAID' ? totals.finalTotal : paidAmount,
        balanceAmount:
          paymentStatus === 'PAID' ? 0 : totals.finalTotal - paidAmount,
        paymentDetails,
        notes,
      };

      const response = await invoicesAPI.update(params.id, invoiceData);
      toast.success(response.message || 'Invoice updated successfully!');

      // Show warnings if any
      if (response.warnings && response.warnings.length > 0) {
        response.warnings.forEach(warning => toast.warning(warning));
      }

      router.push(`/dashboard/invoices/${params.id}`);
    } catch (error) {
      // Show user-friendly error messages
      let errorMessage = 'Failed to update invoice';

      if (error.message) {
        // Convert technical errors to user-friendly messages
        if (error.message.includes('Cast to ObjectId failed') && error.message.includes('Product')) {
          errorMessage = 'Please select a valid product for all items';
        } else if (error.message.includes('validation failed')) {
          errorMessage = 'Please check all fields and try again';
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const totals = calculateTotals();

  if (authLoading || !user) return null;

  if (loadingInvoice) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading invoice...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (invoiceError) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <HiExclamationCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-900 mb-2">Invoice Not Found</h2>
            <p className="text-red-700 mb-4">{invoiceError}</p>
            <button
              onClick={() => router.push('/dashboard/invoices')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Invoices
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Invoice</h1>
          <p className="mt-1 text-sm text-gray-600">Update invoice #{originalInvoice?.invoiceNumber}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-black">
          {/* Customer Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-black">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Customer (Optional)
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative customer-dropdown-container">
                    {/* Display selected customer or search input */}
                    <div
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white cursor-pointer"
                      onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                    >
                      <div className="flex items-center justify-between">
                        <span className={selectedCustomer ? 'text-gray-900' : 'text-gray-500'}>
                          {selectedCustomer ? `${selectedCustomer.name} - ${selectedCustomer.phone}` : 'Cash Customer'}
                        </span>
                        {selectedCustomer && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomerChange('');
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <HiX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dropdown */}
                    {isCustomerDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
                        {/* Search Input */}
                        <div className="p-2 border-b border-gray-200">
                          <div className="relative">
                            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              placeholder="Search by name or phone..."
                              value={customerSearchTerm}
                              onChange={(e) => setCustomerSearchTerm(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              autoFocus
                            />
                          </div>
                        </div>

                        {/* Options */}
                        <div className="max-h-60 overflow-y-auto">
                          {/* Cash Customer Option */}
                          <div
                            onClick={() => handleCustomerChange('')}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-gray-700"
                          >
                            Cash Customer
                          </div>

                          {/* Filtered Customers */}
                          {filteredCustomers.length > 0 ? (
                            filteredCustomers.map((customer) => (
                              <div
                                key={customer._id}
                                onClick={() => handleCustomerChange(customer._id)}
                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-t border-gray-100"
                              >
                                <div className="font-medium text-gray-900">{customer.name}</div>
                                <div className="text-sm text-gray-500">{customer.phone}</div>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              No customers found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(true)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                    title="Add New Customer"
                  >
                    <HiPlus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Type *
                </label>
                <select
                  required
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                >
                  <option value="CGST_SGST">CGST + SGST (Same State)</option>
                  <option value="IGST">IGST (Interstate)</option>
                  <option value="CESS">CESS (Manual Rate)</option>
                </select>
              </div>

              {taxType === 'CESS' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CESS Rate (%) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={cessRate}
                    onChange={(e) => setCessRate(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="Enter CESS rate (e.g., 1 for 1%)"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Invoice Items</h2>
              <button
                type="button"
                onClick={addItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 text-black"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-4">
              {/* Column Headers */}
              {invoiceItems.length > 0 && (
                <div className="flex gap-4 px-4 text-xs font-semibold text-gray-600 uppercase text-black">
                  <div className="flex-1">Product</div>
                  <div className="w-20">Qty</div>
                  <div className="w-28">Price</div>
                  <div className="w-24">GST %</div>
                  <div className="w-24">CESS %</div>
                  <div className="w-32">Total</div>
                  <div className="w-10"></div>
                </div>
              )}

              {invoiceItems.map((item, index) => {
                const hasReturns = item.returnedQuantity > 0;
                return (
                  <div key={index}>
                    <div className="flex gap-4 items-start p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <select
                          required
                          value={item.product}
                          onChange={(e) => updateItem(index, 'product', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Product</option>
                          {products.map((product) => (
                            <option key={product._id} value={product._id}>
                              {product.name} - Stock: {product.stockQuantity}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-20">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>

                      <div className="w-28">
                        <input
                          type="number"
                          required
                          step="0.01"
                          placeholder="Price"
                          value={item.sellingPrice}
                          onChange={(e) => updateItem(index, 'sellingPrice', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>

                      <div className="w-24">
                        <select
                          required
                          value={item.gstRate}
                          onChange={(e) => updateItem(index, 'gstRate', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value={0}>0%</option>
                          <option value={0.25}>0.25%</option>
                          <option value={3}>3%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                          <option value={40}>40%</option>
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={item.cessRate || 0}
                          onChange={(e) => updateItem(index, 'cessRate', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          title="CESS Rate (%)"
                        />
                      </div>

                      <div className="w-32 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm">
                        ₹{(item.quantity * item.sellingPrice * (1 + (item.gstRate + (item.cessRate || 0)) / 100)).toFixed(2)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title={invoiceItems.length === 1 ? "Cannot remove last item" : "Remove item"}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Warning for items with returns */}
                    {hasReturns && (
                      <div className="ml-4 mt-2 flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded">
                        <HiExclamationCircle className="w-4 h-4" />
                        <span>Item has {item.returnedQuantity} unit(s) returned</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {invoiceItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No items added. Click &quot;Add Item&quot; to add products to the invoice.
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
              </div>
              {taxType !== 'CESS' && totals.totalTax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {taxType === 'CGST_SGST' ? 'CGST + SGST' : 'IGST'}:
                  </span>
                  <span className="font-medium">₹{totals.totalTax.toFixed(2)}</span>
                </div>
              )}
              {totals.totalCess > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {taxType === 'CESS' ? `CESS (${cessRate}%)` : 'CESS'}:
                  </span>
                  <span className="font-medium">₹{totals.totalCess.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Discount:</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-32 px-3 py-1 border border-gray-300 rounded-lg text-right"
                  placeholder="0.00"
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Round Off:</span>
                <span className="font-medium">₹{totals.roundOff.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between text-lg font-bold">
                  <span>Grand Total:</span>
                  <span className="text-blue-600">₹{totals.finalTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Status *
                </label>
                <select
                  required
                  value={paymentStatus}
                  onChange={(e) => {
                    setPaymentStatus(e.target.value);
                    if (e.target.value === 'PAID') {
                      setPaidAmount(totals.finalTotal);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="PAID">Paid</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="PARTIAL">Partial Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  required
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              {paymentStatus !== 'PAID' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paid Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={totals.finalTotal}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Balance: ₹{(totals.finalTotal - paidAmount).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Details / Reference
                </label>
                <input
                  type="text"
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., UPI Ref: 123456789"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || invoiceItems.length === 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Updating Invoice...' : 'Update Invoice'}
            </button>
          </div>
        </form>
      </div>

      {/* New Customer Modal */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => {
          setShowCustomerModal(false);
          setCustomerFormErrors({});
        }}
        title="Add New Customer"
        size="max-w-2xl"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={customerFormData.name}
                onChange={handleCustomerFormChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 ${
                  customerFormErrors.name
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-emerald-500'
                }`}
              />
              {customerFormErrors.name && (
                <p className="text-sm text-red-600 flex items-center mt-1">
                  <HiExclamation className="w-4 h-4 mr-1" />
                  {customerFormErrors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={customerFormData.phone}
                onChange={handleCustomerFormChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 ${
                  customerFormErrors.phone
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-emerald-500'
                }`}
              />
              {customerFormErrors.phone && (
                <p className="text-sm text-red-600 flex items-center mt-1">
                  <HiExclamation className="w-4 h-4 mr-1" />
                  {customerFormErrors.phone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={customerFormData.email}
                onChange={handleCustomerFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GSTIN
              </label>
              <input
                type="text"
                name="gstin"
                value={customerFormData.gstin}
                onChange={handleCustomerFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 uppercase"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={customerFormData.address}
                onChange={handleCustomerFormChange}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={customerFormData.city}
                onChange={handleCustomerFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                name="state"
                value={customerFormData.state}
                onChange={handleCustomerFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pincode
              </label>
              <input
                type="text"
                name="pincode"
                value={customerFormData.pincode}
                onChange={handleCustomerFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setShowCustomerModal(false);
                setCustomerFormErrors({});
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingCustomer}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {savingCustomer ? 'Saving...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
