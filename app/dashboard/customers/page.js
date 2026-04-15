'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { customersAPI } from '@/utils/api';
import { useCustomersStore } from '@/store/useCustomersStore';
import {
  HiPlus,
  HiSearch,
  HiPencil,
  HiTrash,
  HiX,
  HiUsers,
  HiMail,
  HiPhone,
  HiLocationMarker,
  HiExclamation,
  HiExclamationCircle,
  HiCheckCircle
} from 'react-icons/hi';

export default function Customers() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { items: customers, loading: loadingCustomers, fetchItems, invalidate } = useCustomersStore();
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState({});

  // Delete modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCannotDelete, setShowCannotDelete] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [formData, setFormData] = useState({
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
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchItems().catch(err => console.error('Error loading customers:', err));
    }
  }, [user, loading, router]);

  const validateForm = () => {
    const newErrors = {};

    // Name is mandatory
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Customer Name is required';
    }

    // Phone is mandatory
    if (!formData.phone || formData.phone.trim() === '') {
      newErrors.phone = 'Phone Number is required';
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

    try {
      if (editingCustomer) {
        await customersAPI.update(editingCustomer._id, formData);
        toast.success('Customer updated successfully!');
      } else {
        await customersAPI.create(formData);
        toast.success('Customer added successfully!');
      }
      setShowModal(false);
      resetForm();
      invalidate();
      fetchItems(true).catch(err => console.error('Error reloading customers:', err));
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      gstin: customer.gstin || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
    });
    setShowModal(true);
  };

  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer);

    // Check if customer has outstanding balance
    if (customer.outstandingBalance > 0) {
      setShowCannotDelete(true);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = async () => {
    try {
      await customersAPI.delete(customerToDelete._id);
      toast.success('Customer deleted successfully!');
      setShowDeleteConfirm(false);
      setCustomerToDelete(null);
      invalidate();
      fetchItems(true).catch(err => console.error('Error reloading customers:', err));
    } catch (error) {
      toast.error(error.message || 'Failed to delete customer');
    }
  };

  const closeDeleteModals = () => {
    setShowDeleteConfirm(false);
    setShowCannotDelete(false);
    setCustomerToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      gstin: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
    });
    setEditingCustomer(null);
    setErrors({});
  };

  if (loading || !user) return null;

  const filteredCustomers = searchTerm.trim()
    ? customers.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : customers;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg shadow-purple-500/50">
                <HiUsers className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
                <p className="mt-1 text-sm text-gray-600">Manage your customer database</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/50 hover:shadow-xl transition-all duration-200"
          >
            <HiPlus className="w-5 h-5 mr-2" />
            Add Customer
          </button>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Search */}
          <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white">
            <div className="relative">
              <HiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers by name, phone, email, or GSTIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-black"
              />
            </div>
          </div>

          {/* Table */}
          {loadingCustomers ? (
            <div className="p-4">
              <TableSkeleton rows={8} columns={6} />
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    GSTIN
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Outstanding
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="p-4 bg-gray-100 rounded-full mb-4">
                          <HiUsers className="w-12 h-12 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">No customers found</p>
                        <p className="text-gray-400 text-sm mt-1">Add your first customer to get started!</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold shadow-lg">
                            {customer.name?.[0]?.toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-semibold text-gray-900">{customer.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-900">
                            <HiPhone className="w-4 h-4 mr-2 text-gray-400" />
                            {customer.phone}
                          </div>
                          {customer.email && (
                            <div className="flex items-center text-xs text-gray-500">
                              <HiMail className="w-4 h-4 mr-2 text-gray-400" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {customer.gstin ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-700">
                            {customer.gstin}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {customer.city || customer.state ? (
                          <div className="flex items-center text-sm text-gray-900">
                            <HiLocationMarker className="w-4 h-4 mr-2 text-gray-400" />
                            {[customer.city, customer.state].filter(Boolean).join(', ')}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          customer.outstandingBalance > 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          ₹{customer.outstandingBalance?.toLocaleString('en-IN') || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="inline-flex items-center px-3 py-1.5 text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all"
                        >
                          <HiPencil className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(customer)}
                          className="inline-flex items-center px-3 py-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                        >
                          <HiTrash className="w-4 h-4 mr-1" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900/75 backdrop-blur-sm" onClick={() => setShowModal(false)} />

            <div className="relative z-50 inline-block w-full max-w-3xl p-8 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-3xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                    <HiUsers className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
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
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (errors.name) {
                          setErrors({ ...errors, name: '' });
                        }
                      }}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all ${
                        errors.name
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
                          : 'border-gray-300 focus:ring-purple-500 focus:border-transparent'
                      }`}
                      placeholder="Enter customer name"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600 flex items-center mt-1">
                        <HiExclamation className="w-4 h-4 mr-1" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        if (errors.phone) {
                          setErrors({ ...errors, phone: '' });
                        }
                      }}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all ${
                        errors.phone
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
                          : 'border-gray-300 focus:ring-purple-500 focus:border-transparent'
                      }`}
                      placeholder="Enter phone number"
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-600 flex items-center mt-1">
                        <HiExclamation className="w-4 h-4 mr-1" />
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Enter email address"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">GSTIN</label>
                    <input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all uppercase"
                      maxLength={15}
                      placeholder="Enter GSTIN"
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Enter street address"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Enter city"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">State</label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select State</option>
                      <option value="Andhra Pradesh">Andhra Pradesh</option>
                      <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                      <option value="Assam">Assam</option>
                      <option value="Bihar">Bihar</option>
                      <option value="Chhattisgarh">Chhattisgarh</option>
                      <option value="Goa">Goa</option>
                      <option value="Gujarat">Gujarat</option>
                      <option value="Haryana">Haryana</option>
                      <option value="Himachal Pradesh">Himachal Pradesh</option>
                      <option value="Jharkhand">Jharkhand</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Kerala">Kerala</option>
                      <option value="Madhya Pradesh">Madhya Pradesh</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Manipur">Manipur</option>
                      <option value="Meghalaya">Meghalaya</option>
                      <option value="Mizoram">Mizoram</option>
                      <option value="Nagaland">Nagaland</option>
                      <option value="Odisha">Odisha</option>
                      <option value="Punjab">Punjab</option>
                      <option value="Rajasthan">Rajasthan</option>
                      <option value="Sikkim">Sikkim</option>
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Telangana">Telangana</option>
                      <option value="Tripura">Tripura</option>
                      <option value="Uttar Pradesh">Uttar Pradesh</option>
                      <option value="Uttarakhand">Uttarakhand</option>
                      <option value="West Bengal">West Bengal</option>
                      <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                      <option value="Chandigarh">Chandigarh</option>
                      <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                      <option value="Ladakh">Ladakh</option>
                      <option value="Lakshadweep">Lakshadweep</option>
                      <option value="Puducherry">Puducherry</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Pincode</label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Enter pincode"
                      maxLength={6}
                    />
                  </div>
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
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/50 transition-all"
                  >
                    {editingCustomer ? 'Update' : 'Add'} Customer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && customerToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900/75 backdrop-blur-sm" onClick={closeDeleteModals} />

            <div className="relative z-50 inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-3xl">
              <div className="flex flex-col items-center">
                {/* Warning Icon */}
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                  <HiExclamationCircle className="w-10 h-10 text-red-600" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Delete Customer?
                </h3>

                {/* Message */}
                <p className="text-center text-gray-600 mb-4">
                  Are you sure you want to delete <span className="font-semibold text-gray-900">{customerToDelete.name}</span>?
                </p>
                <p className="text-center text-sm text-gray-500 mb-6">
                  This action cannot be undone. All customer information will be permanently removed.
                </p>

                {/* Buttons */}
                <div className="flex gap-3 w-full">
                  <button
                    onClick={closeDeleteModals}
                    className="flex-1 px-4 py-3 text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/50 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cannot Delete Modal (Outstanding Balance) */}
      {showCannotDelete && customerToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900/75 backdrop-blur-sm" onClick={closeDeleteModals} />

            <div className="relative z-50 inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-3xl">
              <div className="flex flex-col items-center">
                {/* Warning Icon */}
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
                  <HiExclamationCircle className="w-10 h-10 text-amber-600" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Cannot Delete Customer
                </h3>

                {/* Message */}
                <p className="text-center text-gray-600 mb-3">
                  <span className="font-semibold text-gray-900">{customerToDelete.name}</span> cannot be deleted because they have an outstanding balance.
                </p>

                {/* Outstanding Amount Card */}
                <div className="w-full bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 mb-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Outstanding Amount</p>
                    <p className="text-2xl font-bold text-red-600">
                      ₹{customerToDelete.outstandingBalance?.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <p className="text-center text-sm text-gray-500 mb-6">
                  Please ensure all invoices are paid or settled before deleting this customer.
                </p>

                {/* Button */}
                <button
                  onClick={closeDeleteModals}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/50 transition-all"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
