'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { productsAPI, inventoryAPI } from '@/utils/api';
import {
  HiPlus,
  HiSearch,
  HiPencil,
  HiTrash,
  HiX,
  HiCube,
  HiExclamation,
  HiCheckCircle,
  HiXCircle,
  HiFilter,
  HiChevronLeft,
  HiChevronRight,
  HiChevronDown,
  HiChevronUp
} from 'react-icons/hi';

export default function Products() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [errors, setErrors] = useState({});
  const [serialInput, setSerialInput] = useState(''); // Temp input for adding serial numbers

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({});

  // Search and filter state
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    itemStatus: '',
    category: ''
  });

  // Sorting state
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [formData, setFormData] = useState({
    name: '',
    itemStatus: 'TRADING',
    category: '',
    serialNumbers: [],
    manufactureDate: '',
    hsnCode: '',
    gstRate: 12,
    mrp: '',
    sellingPrice: '',
    purchasePrice: '',
    stockQuantity: '',
    unit: 'PCS',
    batchNo: '',
    batchExpiryDate: '',
    trackInventory: true,   // NEW: true = track stock, false = no inventory
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      loadProducts();
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, filters.itemStatus, filters.category, sortBy, sortOrder]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const params = {
        page,
        limit,
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        )
      };

      const data = await productsAPI.getAllWithBatches(params);
      setProducts(data.products || data); // Handle both old and new response format
      setPagination(data.pagination || {});
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearFilters = () => {
    setFilters({
      itemStatus: '',
      category: ''
    });
    setSearch('');
    setSearchInput('');
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <HiChevronDown className="w-4 h-4 text-gray-400" />;
    return sortOrder === 'asc' ?
      <HiChevronUp className="w-4 h-4 text-emerald-600" /> :
      <HiChevronDown className="w-4 h-4 text-emerald-600" />;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Product Name is required';
    }

    if (!formData.sellingPrice || formData.sellingPrice === '' || parseFloat(formData.sellingPrice) <= 0) {
      newErrors.sellingPrice = 'Selling Price is required and must be greater than 0';
    }

    // Serial numbers must match stock quantity if any are entered
    if (formData.serialNumbers.length > 0) {
      const qty = parseFloat(formData.stockQuantity);
      if (!formData.stockQuantity || isNaN(qty) || qty <= 0) {
        newErrors.serialNumbers = 'Set a Stock Quantity first — serial numbers count must match it';
      } else if (formData.serialNumbers.length !== qty) {
        newErrors.serialNumbers = `Serial numbers count (${formData.serialNumbers.length}) must match Stock Quantity (${qty}). Add or remove ${Math.abs(formData.serialNumbers.length - qty)} number${Math.abs(formData.serialNumbers.length - qty) !== 1 ? 's' : ''}.`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editingProduct) {
        const submitData = {
          ...formData,
          expiryDate: formData.batchExpiryDate || undefined,
          mrp: formData.mrp && formData.mrp !== '' ? parseFloat(formData.mrp) : undefined,
          sellingPrice: formData.sellingPrice && formData.sellingPrice !== '' ? parseFloat(formData.sellingPrice) : undefined,
          purchasePrice: formData.purchasePrice && formData.purchasePrice !== '' ? parseFloat(formData.purchasePrice) : undefined,
          stockQuantity: formData.stockQuantity && formData.stockQuantity !== '' ? parseFloat(formData.stockQuantity) : undefined,
        };
        delete submitData.batchExpiryDate;
        await productsAPI.update(editingProduct._id, submitData);
        toast.success('Product updated successfully!');
      } else {
        const submitData = {
          ...formData,
          expiryDate: formData.batchExpiryDate || undefined,
          mrp: formData.mrp && formData.mrp !== '' ? parseFloat(formData.mrp) : undefined,
          sellingPrice: formData.sellingPrice && formData.sellingPrice !== '' ? parseFloat(formData.sellingPrice) : undefined,
          purchasePrice: formData.purchasePrice && formData.purchasePrice !== '' ? parseFloat(formData.purchasePrice) : undefined,
          stockQuantity: formData.stockQuantity && formData.stockQuantity !== '' ? parseFloat(formData.stockQuantity) : undefined,
        };
        delete submitData.batchExpiryDate;
        await productsAPI.create(submitData);
        toast.success('Product added successfully!');
      }
      setShowModal(false);
      resetForm();
      loadProducts();
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    const newFormData = {
      name: product.name,
      itemStatus: product.itemStatus || 'TRADING',
      category: product.category || '',
      serialNumbers: product.serialNumbers || [],
      manufactureDate: product.manufactureDate ? product.manufactureDate.split('T')[0] : '',
      hsnCode: product.hsnCode || '',
      gstRate: product.gstRate,
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,
      purchasePrice: product.purchasePrice || '',
      stockQuantity: product.stockQuantity,
      unit: product.unit,
      trackInventory: product.trackInventory !== false, // default true
      batchNo: product.batches?.[0]?.batchNo || '',
      batchExpiryDate: product.batches?.[0]?.expiryDate ? product.batches[0].expiryDate.split('T')[0] : '',
    };
    setFormData(newFormData);
    setSerialInput('');
    setShowModal(true);
  };

  const handleDeleteBatch = async (batchId, productName, batchNo) => {
    if (confirm(`Are you sure you want to delete batch "${batchNo || 'N/A'}" of "${productName}"?\n\nNote: If this is the last batch, the product will also be deleted.`)) {
      try {
        const result = await inventoryAPI.deleteBatch(batchId);
        if (result.productDeleted) {
          toast.success('Batch and product deleted successfully (last batch)');
        } else {
          toast.success('Batch deleted successfully');
        }
        loadProducts();
      } catch (error) {
        toast.error(error.message || 'An error occurred');
      }
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (confirm(`Are you sure you want to delete product "${productName}"?\n\nThis product has no batches.`)) {
      try {
        await productsAPI.delete(productId);
        toast.success('Product deleted successfully');
        loadProducts();
      } catch (error) {
        toast.error(error.message || 'An error occurred');
      }
    }
  };

  const handleToggleBatch = async (batchId, isCurrentlyActive) => {
    try {
      await inventoryAPI.toggleBatchActive(batchId);
      toast.success(`Batch ${isCurrentlyActive ? 'deactivated' : 'activated'} successfully!`);
      loadProducts(); // Reload to see updated status
    } catch (error) {
      toast.error(error.message || 'Failed to toggle batch status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      itemStatus: 'TRADING',
      category: '',
      serialNumbers: [],
      expiryDate: '',
      hsnCode: '',
      gstRate: 12,
      mrp: '',
      sellingPrice: '',
      purchasePrice: '',
      stockQuantity: '',
      unit: 'PCS',
      batchNo: '',
      batchExpiryDate: '',
      trackInventory: true,
    });
    setSerialInput('');
    setEditingProduct(null);
    setErrors({});
  };

  if (loading || !user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg shadow-green-500/50">
                <HiCube className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Products</h1>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/50 hover:shadow-xl transition-all duration-200"
          >
            <HiPlus className="w-5 h-5 mr-2" />
            Add Product
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <HiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products by name or HSN code..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-full text-gray-800 pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all flex items-center gap-2"
            >
              <HiSearch className="w-5 h-5" />
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                showFilters
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <HiFilter className="w-5 h-5" />
              Filters
              {Object.values(filters).some(v => v !== '') && (
                <span className="ml-1 px-2 py-0.5 bg-white text-emerald-600 rounded-full text-xs">
                  {Object.values(filters).filter(v => v !== '').length}
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Item Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Item Status</label>
                  <select
                    value={filters.itemStatus}
                    onChange={(e) => {
                      setFilters({ ...filters, itemStatus: e.target.value });
                      setPage(1);
                    }}
                    className="w-full text-gray-800 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All Status</option>
                    <option value="TRADING">Trading Item</option>
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="FINISHED">Finished Good</option>
                    <option value="SEMI">Semi-Finished</option>
                    <option value="CONSUMABLE">Consumable</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <input
                    type="text"
                    value={filters.category}
                    onChange={(e) => {
                      setFilters({ ...filters, category: e.target.value });
                      setPage(1);
                    }}
                    placeholder="Filter by category..."
                    className="w-full text-gray-800 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              {(search || Object.values(filters).some(v => v !== '')) && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Summary and Page Size */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {products.length > 0 ? ((page - 1) * limit + 1) : 0} to {Math.min(page * limit, pagination.total || 0)} of {pagination.total || 0} products
          </p>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Show:</label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

          {/* Table */}
          {loadingProducts ? (
            <div className="p-4">
              <TableSkeleton rows={8} columns={7} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Product
                        <SortIcon field="name" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('itemStatus')}
                    >
                      <div className="flex items-center gap-2">
                        Item Status
                        <SortIcon field="itemStatus" />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Batch/Expiry
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      MRP
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Selling Price
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('gstRate')}
                    >
                      <div className="flex items-center gap-2">
                        GST
                        <SortIcon field="gstRate" />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="p-4 bg-gray-100 rounded-full mb-4">
                            <HiCube className="w-12 h-12 text-gray-400" />
                          </div>
                          <p className="text-gray-500 font-medium">No products found</p>
                          <p className="text-gray-400 text-sm mt-1">Add your first product to get started!</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => {
                      // Show batch-wise rows if batches exist
                      if (product.batches && product.batches.length > 0) {
                        return product.batches.map((batch, batchIdx) => {
                          const isInactive = !batch.isActive;
                          return (
                            <tr
                              key={`${product._id}-${batch._id}`}
                              className={`hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-colors ${isInactive ? 'bg-gray-50/50' : ''}`}
                            >
                              <td className="px-6 py-4">
                                <div>
                                  <div className={`text-sm font-semibold max-w-[200px] md:max-w-xs xl:max-w-sm whitespace-normal break-all ${isInactive ? 'text-gray-400' : 'text-gray-900'}`}>
                                    {product.name}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    {product.batches.length > 1 && (
                                      <div className={`text-xs ${isInactive ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Batch {batchIdx + 1} of {product.batches.length}
                                      </div>
                                    )}
                                    {isInactive && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-200 text-gray-600">
                                        Inactive
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              {/* Item Status badge */}
                              <td className="px-6 py-4">
                                {(() => {
                                  const s = product.itemStatus || 'TRADING';
                                  const map = {
                                    TRADING: { label: 'Trading', cls: 'bg-blue-100 text-blue-700' },
                                    RAW_MATERIAL: { label: 'Raw Material', cls: 'bg-yellow-100 text-yellow-700' },
                                    FINISHED: { label: 'Finished Good', cls: 'bg-green-100 text-green-700' },
                                    SEMI: { label: 'Semi-Finished', cls: 'bg-purple-100 text-purple-700' },
                                    CONSUMABLE: { label: 'Consumable', cls: 'bg-orange-100 text-orange-700' },
                                  };
                                  const { label, cls } = map[s] || map.TRADING;
                                  return (
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${isInactive ? 'bg-gray-100 text-gray-400' : cls}`}>
                                      {label}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className={`px-6 py-4 text-sm ${isInactive ? 'text-gray-400' : 'text-gray-900'}`}>
                                <div className="space-y-1">
                                  <div className="font-medium max-w-[150px] whitespace-normal break-all">{batch.batchNo || 'N/A'}</div>
                                  {batch.expiryDate && (
                                    <div className={`text-xs ${isInactive ? 'text-gray-400' : 'text-gray-500'}`}>
                                      Exp: {new Date(batch.expiryDate).toLocaleDateString('en-IN')}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${isInactive
                                    ? 'bg-gray-100 text-gray-500'
                                    : batch.quantity === 0
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-green-100 text-green-700'
                                    }`}
                                >
                                  {batch.quantity} {product.unit}
                                </span>
                              </td>
                              <td className={`px-6 py-4 text-sm font-semibold ${isInactive ? 'text-gray-400' : 'text-gray-900'}`}>
                                ₹{batch.mrp?.toLocaleString('en-IN') || '-'}
                              </td>
                              <td className={`px-6 py-4 text-sm font-semibold ${isInactive ? 'text-gray-400' : 'text-gray-900'}`}>
                                ₹{batch.sellingPrice?.toLocaleString('en-IN') || '-'}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${isInactive ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                  {batch.gstRate || product.gstRate}%
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-sm font-medium">
                                <div className="flex items-center justify-end gap-3">
                                  {/* Toggle Slider */}
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs font-medium ${batch.isActive ? 'text-gray-400' : 'text-gray-600'}`}>
                                      Off
                                    </span>
                                    <button
                                      onClick={() => handleToggleBatch(batch._id, batch.isActive)}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${batch.isActive
                                        ? 'bg-green-500 focus:ring-green-500'
                                        : 'bg-gray-300 focus:ring-gray-400'
                                        }`}
                                      title={batch.isActive ? 'Click to deactivate' : 'Click to activate'}
                                    >
                                      <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${batch.isActive ? 'translate-x-6' : 'translate-x-1'
                                          }`}
                                      />
                                    </button>
                                    <span className={`text-xs font-medium ${batch.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                                      On
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => handleEdit(product)}
                                    className="inline-flex items-center px-3 py-1.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
                                  >
                                    <HiPencil className="w-4 h-4 mr-1" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBatch(batch._id, product.name, batch.batchNo)}
                                    className="inline-flex items-center px-3 py-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                                  >
                                    <HiTrash className="w-4 h-4 mr-1" />
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      } else {
                        // Product with no batches - show as before
                        return (
                          <tr key={product._id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-semibold text-gray-900 max-w-[200px] md:max-w-xs xl:max-w-sm whitespace-normal break-all">{product.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {(() => {
                                const s = product.itemStatus || 'TRADING';
                                const map = {
                                  TRADING: { label: 'Trading', cls: 'bg-blue-100 text-blue-700' },
                                  RAW_MATERIAL: { label: 'Raw Material', cls: 'bg-yellow-100 text-yellow-700' },
                                  FINISHED: { label: 'Finished Good', cls: 'bg-green-100 text-green-700' },
                                  SEMI: { label: 'Semi-Finished', cls: 'bg-purple-100 text-purple-700' },
                                  CONSUMABLE: { label: 'Consumable', cls: 'bg-orange-100 text-orange-700' },
                                };
                                const { label, cls } = map[s] || map.TRADING;
                                return (
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${cls}`}>
                                    {label}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500" colSpan="5">
                              No stock available
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-3">
                                <button
                                  onClick={() => handleEdit(product)}
                                  className="inline-flex items-center px-3 py-1.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
                                >
                                  <HiPencil className="w-4 h-4 mr-1" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product._id, product.name)}
                                  className="inline-flex items-center px-3 py-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                                >
                                  <HiTrash className="w-4 h-4 mr-1" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer - Same design as inventory page */}
          {products.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Info text */}
              <p className="text-sm text-gray-600">
                {pagination.total === 0
                  ? 'No entries found'
                  : `Showing ${((page - 1) * limit) + 1}–${Math.min(page * limit, pagination.total || 0)} of ${pagination.total || 0} entries`}
              </p>

              {/* Page buttons */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={!pagination.hasPrevPage}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-600 transition-colors"
                  >
                    <HiChevronLeft className="w-4 h-4" />
                  </button>

                  {(() => {
                    const totalPages = pagination.totalPages;
                    const safePage = Math.min(page, totalPages);
                    const delta = 2;
                    const pageNumbers = [];

                    for (let i = 1; i <= totalPages; i++) {
                      if (i === 1 || i === totalPages || (i >= safePage - delta && i <= safePage + delta)) {
                        pageNumbers.push(i);
                      } else if (pageNumbers[pageNumbers.length - 1] !== '...') {
                        pageNumbers.push('...');
                      }
                    }

                    return pageNumbers.map((p, idx) =>
                      p === '...'
                        ? <span key={`el-${idx}`} className="px-2 text-gray-400 select-none">…</span>
                        : (
                          <button
                            key={p}
                            onClick={() => handlePageChange(p)}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors border ${safePage === p
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            {p}
                          </button>
                        )
                    );
                  })()}

                  <button
                    onClick={() => handlePageChange(Math.min(pagination.totalPages, page + 1))}
                    disabled={!pagination.hasNextPage}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-600 transition-colors"
                  >
                    <HiChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900/75 backdrop-blur-sm" onClick={() => setShowModal(false)} />

            <div className="relative z-50 inline-block w-full max-w-4xl p-8 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-3xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                    <HiCube className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <HiX className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 text-black">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Product Name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: '' });
                      }}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all ${errors.name
                        ? 'border-red-500 focus:ring-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                        }`}
                      placeholder="Enter product name"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600 flex items-center mt-1">
                        <HiExclamation className="w-4 h-4 mr-1" />{errors.name}
                      </p>
                    )}
                  </div>

                  {/* Item Status */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Item Status</label>
                    <select
                      value={formData.itemStatus}
                      onChange={(e) => setFormData({ ...formData, itemStatus: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="TRADING">Trading Item</option>
                      <option value="RAW_MATERIAL">Raw Material</option>
                      <option value="FINISHED">Finished Good</option>
                      <option value="SEMI">Semi-Finished</option>
                      <option value="CONSUMABLE">Consumable</option>
                    </select>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Category <span className="text-xs text-gray-500">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="e.g. Electronics, Clothing, Food..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">HSN Code</label>
                    <input
                      type="text"
                      value={formData.hsnCode}
                      onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter HSN code"
                    />
                  </div>

                  {/* GST Rate */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">GST Rate (%)</label>
                    <select
                      value={formData.gstRate}
                      onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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

                  {/* MRP */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">MRP</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.mrp}
                      onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Selling Price */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Selling Price <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.sellingPrice}
                      onChange={(e) => {
                        setFormData({ ...formData, sellingPrice: e.target.value });
                        if (errors.sellingPrice) setErrors({ ...errors, sellingPrice: '' });
                      }}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all ${errors.sellingPrice
                        ? 'border-red-500 focus:ring-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                        }`}
                      placeholder="0.00"
                    />
                    {errors.sellingPrice && (
                      <p className="text-sm text-red-600 flex items-center mt-1">
                        <HiExclamation className="w-4 h-4 mr-1" />{errors.sellingPrice}
                      </p>
                    )}
                  </div>

                  {/* Purchase Price */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Purchase Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="0.00"
                    />
                  </div>



                  {/* Unit */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Unit</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="PCS">PCS</option>
                      <option value="BOX">BOX</option>
                      <option value="STRIP">STRIP</option>
                      <option value="BOTTLE">BOTTLE</option>
                      <option value="KG">KG</option>
                      <option value="LITRE">LITRE</option>
                    </select>
                  </div>

                  {/* ── Track Inventory Toggle ── */}
                  <div className="md:col-span-2">
                    <label
                      className={`flex items-center justify-between gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${formData.trackInventory
                        ? 'border-green-400 bg-green-50'
                        : 'border-orange-400 bg-orange-50'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${formData.trackInventory ? 'bg-green-100' : 'bg-orange-100'}`}>
                          {formData.trackInventory
                            ? <HiCheckCircle className="w-5 h-5 text-green-600" />
                            : <HiXCircle className="w-5 h-5 text-orange-500" />
                          }
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${formData.trackInventory ? 'text-green-800' : 'text-orange-800'}`}>
                            {formData.trackInventory ? 'Inventory Tracked' : 'No Inventory Tracking'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formData.trackInventory
                              ? 'Stock is managed — product appears in invoice only when in stock'
                              : 'No stock management — product always available in invoices'}
                          </p>
                        </div>
                      </div>
                      {/* Slider toggle */}
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, trackInventory: !formData.trackInventory })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${formData.trackInventory ? 'bg-green-500' : 'bg-orange-400'
                          }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.trackInventory ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                      </button>
                    </label>
                  </div>

                  {/* ── Stock / Batch fields — only when trackInventory is ON ── */}
                  {formData.trackInventory && (<>

                    {/* Stock Quantity */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Stock Quantity</label>
                      <input
                        type="number"
                        value={formData.stockQuantity}
                        onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="0"
                      />
                    </div>

                    {/* Batch Details banner */}
                    <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-start space-x-3">
                        <HiExclamation className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-semibold text-blue-900">Batch Details</h4>
                          <p className="text-xs text-blue-700 mt-1">
                            Batch number will be auto-generated if left empty.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Batch Number */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Batch Number <span className="text-xs text-gray-500">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.batchNo}
                        onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Auto-generated if left empty"
                      />
                    </div>

                    {/* Batch Expiry Date */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Batch Expiry Date <span className="text-xs text-gray-500">(Optional)</span>
                      </label>
                      <input
                        type="date"
                        value={formData.batchExpiryDate}
                        onChange={(e) => setFormData({ ...formData, batchExpiryDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Manufacture Date */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Manufacture Date <span className="text-xs text-gray-500">(Optional)</span>
                      </label>
                      <input
                        type="date"
                        value={formData.manufactureDate}
                        onChange={(e) => setFormData({ ...formData, manufactureDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>

                    {/* ── Serial / IMEI Numbers ── */}
                    <div className="md:col-span-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-gray-700">
                          Serial / IMEI Numbers
                          <span className="ml-2 text-xs font-normal text-gray-400">(Optional — if added, count must match Stock Qty)</span>
                        </label>
                        {/* Live match indicator */}
                        {(() => {
                          const snCount = formData.serialNumbers.length;
                          const qty = parseFloat(formData.stockQuantity);
                          if (snCount === 0) return null;
                          if (!formData.stockQuantity || isNaN(qty) || qty <= 0) {
                            return (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                                {snCount} added — set Stock Qty
                              </span>
                            );
                          }
                          const matches = snCount === qty;
                          return (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${matches ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                              }`}>
                              {snCount} / {qty} {matches ? '✓ Match' : `— need ${qty > snCount ? `+${qty - snCount}` : `-${snCount - qty}`}`}
                            </span>
                          );
                        })()}
                      </div>

                      {/* Textarea for bulk paste — comma or newline separated */}
                      <div className="space-y-2">
                        <textarea
                          value={serialInput}
                          onChange={(e) => setSerialInput(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none font-mono text-sm"
                          placeholder={'Paste serial / IMEI numbers here.\nSeparate by comma or new line — e.g. from Excel.'}
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">Separate multiple numbers with commas or new lines</p>
                          <button
                            type="button"
                            disabled={!serialInput.trim()}
                            onClick={() => {
                              const incoming = serialInput
                                .split(/[\n,]+/)
                                .map((s) => s.trim())
                                .filter(Boolean);

                              if (!incoming.length) return;

                              const existing = formData.serialNumbers;
                              let duplicates = 0;
                              const toAdd = [];

                              for (const val of incoming) {
                                if (existing.includes(val) || toAdd.includes(val)) {
                                  duplicates++;
                                  continue;
                                }
                                toAdd.push(val);
                              }

                              setFormData({ ...formData, serialNumbers: [...existing, ...toAdd] });
                              setSerialInput('');

                              if (toAdd.length > 0) toast.success(`${toAdd.length} number${toAdd.length > 1 ? 's' : ''} added`);
                              if (duplicates > 0) toast.error(`${duplicates} duplicate${duplicates > 1 ? 's' : ''} skipped`);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Parse &amp; Add
                          </button>
                        </div>
                      </div>

                      {/* Chips */}
                      {formData.serialNumbers.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                          {formData.serialNumbers.map((sn, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-white border border-blue-200 text-blue-800 text-xs font-mono font-medium rounded-lg shadow-sm"
                            >
                              {sn}
                              <button
                                type="button"
                                onClick={() => setFormData({
                                  ...formData,
                                  serialNumbers: formData.serialNumbers.filter((_, i) => i !== idx)
                                })}
                                className="w-4 h-4 flex items-center justify-center rounded-full bg-blue-100 hover:bg-red-100 text-blue-500 hover:text-red-500 transition-colors"
                              >
                                <HiX className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, serialNumbers: [] })}
                            className="text-xs text-red-400 hover:text-red-600 underline ml-auto self-center"
                          >
                            Clear all
                          </button>
                        </div>
                      )}

                      {/* Validation error */}
                      {errors.serialNumbers && (
                        <p className="text-sm text-red-600 flex items-start gap-1.5 mt-1">
                          <HiExclamation className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {errors.serialNumbers}
                        </p>
                      )}
                    </div>

                  </>)}

                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 text-gray-700 font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/50 transition-all"
                  >
                    {editingProduct ? 'Update' : 'Add'} Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
