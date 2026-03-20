'use client';

import { useToast } from '@/context/ToastContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { purchasesAPI, suppliersAPI, productsAPI } from '@/utils/api';
import { HiArrowLeft, HiPlus, HiTrash, HiExclamation } from 'react-icons/hi';
import Link from 'next/link';

export default function NewPurchasePage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    supplier: '',
    billNumber: '',
    billDate: new Date().toISOString().split('T')[0],
    purchaseDate: new Date().toISOString().split('T')[0],
    items: [],
    freightCharges: 0,
    packagingCharges: 0,
    otherCharges: 0,
    discount: 0,
    paymentStatus: 'UNPAID',
    paymentMode: 'CREDIT',
    paidAmount: 0,
    notes: ''
  });

  // Supplier modal state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [supplierFormErrors, setSupplierFormErrors] = useState({});
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    bankDetails: {
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branch: ''
    },
    paymentTerms: 'NET_30',
    creditDays: 30,
    creditLimit: 0,
    openingBalance: 0,
    notes: ''
  });

  // Product modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(null);
  const [productFormData, setProductFormData] = useState({
    name: '',
    hsnCode: '',
    gstRate: 12,
    mrp: 0,
    sellingPrice: 0,
    purchasePrice: 0,
    unit: 'PCS'
  });
  const [productFormErrors, setProductFormErrors] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [suppliersData, productsData] = await Promise.all([
        suppliersAPI.getAll({ isActive: true }),
        productsAPI.getAll()
      ]);
      setSuppliers(suppliersData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(error.message || 'An error occurred');
    }
  };

  const handleSupplierFormChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('bank.')) {
      const bankField = name.split('.')[1];
      setSupplierFormData({
        ...supplierFormData,
        bankDetails: {
          ...supplierFormData.bankDetails,
          [bankField]: value
        }
      });
    } else {
      setSupplierFormData({ ...supplierFormData, [name]: value });
    }
    // Clear error for this field
    if (supplierFormErrors[name]) {
      setSupplierFormErrors({ ...supplierFormErrors, [name]: '' });
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();

    // Validate that name is provided
    if (!supplierFormData.name || supplierFormData.name.trim() === '') {
      setSupplierFormErrors({ name: 'Supplier Name is required' });
      toast.error('Please enter supplier name');
      return;
    }

    setSavingSupplier(true);

    try {
      const newSupplier = await suppliersAPI.create(supplierFormData);
      // Reload suppliers list (only active ones)
      const suppliersData = await suppliersAPI.getAll({ isActive: true });
      setSuppliers(suppliersData);
      // Auto-select the newly created supplier
      setFormData({ ...formData, supplier: newSupplier._id });
      // Close modal and reset form
      setShowSupplierModal(false);
      setSupplierFormData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        gstin: '',
        pan: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        bankDetails: {
          bankName: '',
          accountNumber: '',
          ifscCode: '',
          branch: ''
        },
        paymentTerms: 'NET_30',
        creditDays: 30,
        creditLimit: 0,
        openingBalance: 0,
        notes: ''
      });
      setSupplierFormErrors({});
      toast.success('Supplier added successfully!');
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleProductFormChange = (e) => {
    const { name, value } = e.target;
    setProductFormData({ ...productFormData, [name]: value });
    // Clear error for this field
    if (productFormErrors[name]) {
      setProductFormErrors({ ...productFormErrors, [name]: '' });
    }
  };

  const validateProductForm = () => {
    const newErrors = {};

    // Product Name is mandatory
    if (!productFormData.name || productFormData.name.trim() === '') {
      newErrors.name = 'Product Name is required';
    }

    // MRP is mandatory
    if (!productFormData.mrp || parseFloat(productFormData.mrp) <= 0) {
      newErrors.mrp = 'MRP is required and must be greater than 0';
    }

    // Selling Price is mandatory
    if (!productFormData.sellingPrice || parseFloat(productFormData.sellingPrice) <= 0) {
      newErrors.sellingPrice = 'Selling Price is required and must be greater than 0';
    }

    // Purchase Price is mandatory
    if (!productFormData.purchasePrice || parseFloat(productFormData.purchasePrice) <= 0) {
      newErrors.purchasePrice = 'Purchase Price is required and must be greater than 0';
    }

    setProductFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();

    if (!validateProductForm()) {
      toast.error('Please fill all required fields');
      return;
    }

    setSavingProduct(true);

    try {
      // Always create product with 0 stock - stock will be added through purchase
      const newProduct = await productsAPI.create({
        ...productFormData,
        stockQuantity: 0
      });
      // Reload products list
      const productsData = await productsAPI.getAll();
      setProducts(productsData);
      // Auto-select the newly created product in the current item and autofill fields
      if (currentItemIndex !== null) {
        // Use handleProductSelect to autofill all fields from the new product
        const newItems = [...formData.items];
        newItems[currentItemIndex] = {
          ...newItems[currentItemIndex],
          product: newProduct._id,
          purchasePrice: newProduct.purchasePrice || 0,
          mrp: newProduct.mrp || 0,
          sellingPrice: newProduct.sellingPrice || 0,
          gstRate: newProduct.gstRate || 12
        };
        setFormData({ ...formData, items: newItems });
      }
      // Close modal and reset form
      setShowProductModal(false);
      setCurrentItemIndex(null);
      setProductFormData({
        name: '',
        hsnCode: '',
        gstRate: 12,
        mrp: 0,
        sellingPrice: 0,
        purchasePrice: 0,
        unit: 'PCS'
      });
      setProductFormErrors({});
      toast.success('Product added successfully!');
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setSavingProduct(false);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          product: '',
          batchNo: '',
          expiryDate: '',
          quantity: 1,
          freeQuantity: 0,
          purchasePrice: 0,
          mrp: 0,
          sellingPrice: 0,
          gstRate: 12,
          discount: 0
        }
      ]
    });
    // Clear items error when adding an item
    if (errors.items) {
      setErrors({ ...errors, items: '' });
    }
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleProductSelect = (index, productId) => {
    if (!productId) {
      // If product is deselected, just update the product field
      updateItem(index, 'product', '');
      return;
    }

    // Find the selected product
    const selectedProduct = products.find(p => p._id === productId);

    if (selectedProduct) {
      // Update item with product ID and autofill all available fields
      const newItems = [...formData.items];
      newItems[index] = {
        ...newItems[index],
        product: productId,
        purchasePrice: selectedProduct.purchasePrice || 0,
        mrp: selectedProduct.mrp || 0,
        sellingPrice: selectedProduct.sellingPrice || 0,
        gstRate: selectedProduct.gstRate || 12
      };
      setFormData({ ...formData, items: newItems });
    }
  };

  const calculateItemTotal = (item) => {
    const taxableAmount = (item.quantity * item.purchasePrice) - (item.discount || 0);
    const gstAmount = (taxableAmount * item.gstRate) / 100;
    return taxableAmount + gstAmount;
  };

  const calculateTotals = () => {
    const itemsTotal = formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const additionalCharges = (formData.freightCharges || 0) + (formData.packagingCharges || 0) + (formData.otherCharges || 0);
    const grandTotal = itemsTotal + additionalCharges - (formData.discount || 0);

    const totalGST = formData.items.reduce((sum, item) => {
      const taxableAmount = (item.quantity * item.purchasePrice) - (item.discount || 0);
      return sum + ((taxableAmount * item.gstRate) / 100);
    }, 0);

    const subtotal = itemsTotal - totalGST;

    return { subtotal, totalGST, grandTotal };
  };

  const validateForm = () => {
    const newErrors = {};

    // Supplier is mandatory
    if (!formData.supplier || formData.supplier === '') {
      newErrors.supplier = 'Please select a supplier';
    }

    // At least one item is mandatory
    if (formData.items.length === 0) {
      newErrors.items = 'Please add at least one item to the purchase';
    }

    // Check if all items have products selected
    const emptyProductIndex = formData.items.findIndex(item => !item.product || item.product === '');
    if (emptyProductIndex !== -1) {
      toast.error(`Please select a product for item #${emptyProductIndex + 1}`);
      return false;
    }

    // Check if all items have quantity > 0
    const zeroQuantityIndex = formData.items.findIndex(item => !item.quantity || item.quantity <= 0);
    if (zeroQuantityIndex !== -1) {
      toast.error(`Please enter quantity for item #${zeroQuantityIndex + 1}`);
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form first
    if (!validateForm()) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      const totals = calculateTotals();
      const purchaseData = {
        ...formData,
        subtotal: totals.subtotal,
        totalGST: totals.totalGST,
        grandTotal: totals.grandTotal
      };

      await purchasesAPI.create(purchaseData);
      toast.success('Purchase entry added successfully!');
      router.push('/dashboard/purchases');
    } catch (error) {
      // Parse backend validation errors and show user-friendly messages
      let errorMessage = error.message || 'An error occurred';

      // Convert technical errors to user-friendly messages
      if (errorMessage.includes('Cast to ObjectId failed') && errorMessage.includes('Product')) {
        errorMessage = 'Please select a valid product for all items';
      } else if (errorMessage.includes('validation failed')) {
        errorMessage = 'Please check all fields and try again';
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchases" className="text-gray-600 hover:text-gray-900">
            <HiArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add Purchase Entry</h1>
            <p className="text-gray-500 mt-1">Enter purchase details below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-black">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <select
                      value={formData.supplier}
                      onChange={(e) => {
                        setFormData({ ...formData, supplier: e.target.value });
                        if (errors.supplier) {
                          setErrors({ ...errors, supplier: '' });
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 ${errors.supplier
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-emerald-500'
                        }`}
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier._id} value={supplier._id}>
                          {supplier.name} - {supplier.gstin}
                        </option>
                      ))}
                    </select>
                    {errors.supplier && (
                      <p className="text-sm text-red-600 flex items-center mt-1">
                        <HiExclamation className="w-4 h-4 mr-1" />
                        {errors.supplier}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSupplierModal(true)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                    title="Add New Supplier"
                  >
                    <HiPlus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Bill Number
                  <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.billNumber}
                  onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter bill number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bill Date
                  <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={formData.billDate}
                  onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Date
                  <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Items <span className="text-red-500">*</span>
                </h2>
                {errors.items && (
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <HiExclamation className="w-4 h-4 mr-1" />
                    {errors.items}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={addItem}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2"
              >
                <HiPlus className="w-5 h-5" />
                Add Item
              </button>
            </div>

            {formData.items.length === 0 ? (
              <div className={`text-center py-8 ${errors.items ? 'text-red-500 bg-red-50 border border-red-200 rounded-lg' : 'text-gray-500'}`}>
                No items added. Click Add Item to start.
              </div>
            ) : (
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-medium text-gray-900">Item {index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <HiTrash className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={item.product}
                            onChange={(e) => handleProductSelect(index, e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">Select Product</option>
                            {products.map((product) => (
                              <option key={product._id} value={product._id} title={product.name}>
                                {product.name.length > 40 ? product.name.substring(0, 40) + '...' : product.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentItemIndex(index);
                              setShowProductModal(true);
                            }}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                            title="Add New Product"
                          >
                            <HiPlus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Batch Number
                          <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={item.batchNo || ''}
                          onChange={(e) => updateItem(index, 'batchNo', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="Auto-generated if empty"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expiry Date
                          <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                        </label>
                        <input
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) => updateItem(index, 'expiryDate', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="Select expiry date"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity
                          <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}

                          min="1"
                          step="1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Free Qty
                          <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          value={item.freeQuantity}
                          onChange={(e) => updateItem(index, 'freeQuantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Purchase Price
                          <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          value={item.purchasePrice}
                          onChange={(e) => updateItem(index, 'purchasePrice', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          MRP
                          <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          value={item.mrp}
                          onChange={(e) => updateItem(index, 'mrp', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Selling Price
                          <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          value={item.sellingPrice}
                          onChange={(e) => updateItem(index, 'sellingPrice', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          GST Rate (%)
                          <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                        </label>
                        <select
                          value={item.gstRate}
                          onChange={(e) => updateItem(index, 'gstRate', parseFloat(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="0">0%</option>
                          <option value="0.25">0.25%</option>
                          <option value="3">3%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                          <option value="40">40%</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Discount (₹)
                        </label>
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Item Total
                        </label>
                        <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg font-medium">
                          ₹{calculateItemTotal(item).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Charges & Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Additional Charges */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Charges</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Freight Charges (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.freightCharges}
                    onChange={(e) => setFormData({ ...formData, freightCharges: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Packaging Charges (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.packagingCharges}
                    onChange={(e) => setFormData({ ...formData, packagingCharges: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Other Charges (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.otherCharges}
                    onChange={(e) => setFormData({ ...formData, otherCharges: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overall Discount (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Mode
                  </label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CREDIT">Credit</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Status
                  </label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="UNPAID">Unpaid</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>

                {formData.paymentStatus !== 'UNPAID' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount Paid (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.paidAmount}
                      onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-emerald-50 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Total GST:</span>
                <span>₹{totals.totalGST.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Additional Charges:</span>
                <span>₹{((formData.freightCharges || 0) + (formData.packagingCharges || 0) + (formData.otherCharges || 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Discount:</span>
                <span>- ₹{(formData.discount || 0).toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-emerald-200 pt-2 mt-2">
                <div className="flex justify-between text-xl font-bold text-gray-900">
                  <span>Grand Total:</span>
                  <span>₹{totals.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-4">
            <Link
              href="/dashboard/purchases"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Purchase'}
            </button>
          </div>
        </form>
      </div>

      {/* New Supplier Modal */}
      <Modal
        isOpen={showSupplierModal}
        onClose={() => {
          setShowSupplierModal(false);
          setSupplierFormErrors({});
        }}
        title="Add New Supplier"
        size="max-w-4xl"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={supplierFormData.name}
                  onChange={handleSupplierFormChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 text-gray-900 placeholder-gray-500 ${supplierFormErrors.name
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-emerald-500'
                    }`}
                />
                {supplierFormErrors.name && (
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <HiExclamation className="w-4 h-4 mr-1" />
                    {supplierFormErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  value={supplierFormData.contactPerson}
                  onChange={handleSupplierFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={supplierFormData.phone}
                  onChange={handleSupplierFormChange}

                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={supplierFormData.email}
                  onChange={handleSupplierFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Tax Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GSTIN
                </label>
                <input
                  type="text"
                  name="gstin"
                  value={supplierFormData.gstin}
                  onChange={handleSupplierFormChange}

                  maxLength={15}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 uppercase text-gray-900 placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PAN
                </label>
                <input
                  type="text"
                  name="pan"
                  value={supplierFormData.pan}
                  onChange={handleSupplierFormChange}
                  maxLength={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 uppercase text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  name="address"
                  value={supplierFormData.address}
                  onChange={handleSupplierFormChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={supplierFormData.city}
                    onChange={handleSupplierFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={supplierFormData.state}
                    onChange={handleSupplierFormChange}

                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pincode
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={supplierFormData.pincode}
                    onChange={handleSupplierFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder-gray-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </label>
                <select
                  name="paymentTerms"
                  value={supplierFormData.paymentTerms}
                  onChange={handleSupplierFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900"
                >
                  <option value="IMMEDIATE">Immediate</option>
                  <option value="NET_15">Net 15 Days</option>
                  <option value="NET_30">Net 30 Days</option>
                  <option value="NET_45">Net 45 Days</option>
                  <option value="NET_60">Net 60 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credit Limit (₹)
                </label>
                <input
                  type="number"
                  name="creditLimit"
                  value={supplierFormData.creditLimit}
                  onChange={handleSupplierFormChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  name="openingBalance"
                  value={supplierFormData.openingBalance}
                  onChange={handleSupplierFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={supplierFormData.notes}
              onChange={handleSupplierFormChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder-gray-500"
              placeholder="Any additional notes about this supplier..."
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setShowSupplierModal(false);
                setSupplierFormErrors({});
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingSupplier}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {savingSupplier ? 'Saving...' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </Modal>


      {/* New Product Modal */}
      <Modal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setCurrentItemIndex(null);
        }}
        title="Add New Product"
        size="max-w-4xl"
      >
        <form onSubmit={handleCreateProduct} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={productFormData.name}
                  onChange={handleProductFormChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 transition-all text-gray-900 placeholder-gray-500 ${productFormErrors.name
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-emerald-500 focus:border-transparent'
                    }`}
                  placeholder="Enter product name"
                />
                {productFormErrors.name && (
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <HiExclamation className="w-4 h-4 mr-1" />
                    {productFormErrors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  HSN Code
                </label>
                <input
                  type="text"
                  name="hsnCode"
                  value={productFormData.hsnCode}
                  onChange={handleProductFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                  placeholder="Enter HSN code"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Unit
                </label>
                <select
                  name="unit"
                  value={productFormData.unit}
                  onChange={handleProductFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                >
                  <option value="PCS">Pieces</option>
                  <option value="BOX">Box</option>
                  <option value="STRIP">Strip</option>
                  <option value="BOTTLE">Bottle</option>
                  <option value="KG">KG</option>
                  <option value="LITRE">Litre</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  MRP (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="mrp"
                  value={productFormData.mrp}
                  onChange={handleProductFormChange}
                  min="0"
                  step="0.01"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 transition-all text-gray-900 placeholder-gray-500 ${productFormErrors.mrp
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-emerald-500 focus:border-transparent'
                    }`}
                  placeholder="Enter MRP"
                />
                {productFormErrors.mrp && (
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <HiExclamation className="w-4 h-4 mr-1" />
                    {productFormErrors.mrp}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Selling Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="sellingPrice"
                  value={productFormData.sellingPrice}
                  onChange={handleProductFormChange}
                  min="0"
                  step="0.01"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 transition-all text-gray-900 placeholder-gray-500 ${productFormErrors.sellingPrice
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-emerald-500 focus:border-transparent'
                    }`}
                  placeholder="Enter selling price"
                />
                {productFormErrors.sellingPrice && (
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <HiExclamation className="w-4 h-4 mr-1" />
                    {productFormErrors.sellingPrice}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Purchase Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="purchasePrice"
                  value={productFormData.purchasePrice}
                  onChange={handleProductFormChange}
                  min="0"
                  step="0.01"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 transition-all text-gray-900 placeholder-gray-500 ${productFormErrors.purchasePrice
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-emerald-500 focus:border-transparent'
                    }`}
                  placeholder="Enter purchase price"
                />
                {productFormErrors.purchasePrice && (
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <HiExclamation className="w-4 h-4 mr-1" />
                    {productFormErrors.purchasePrice}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  GST Rate (%)
                </label>
                <select
                  name="gstRate"
                  value={productFormData.gstRate}
                  onChange={handleProductFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900"
                >
                  <option value="0">0%</option>
                  <option value="0.25">0.25%</option>
                  <option value="3">3%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                  <option value="40">40%</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setShowProductModal(false);
                setCurrentItemIndex(null);
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingProduct}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {savingProduct ? 'Saving...' : 'Add Product'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
