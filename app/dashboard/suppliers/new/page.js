'use client';

import { useToast } from '@/context/ToastContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { suppliersAPI } from '@/utils/api';
import { useSuppliersStore } from '@/store/useSuppliersStore';
import { HiArrowLeft, HiExclamation } from 'react-icons/hi';
import Link from 'next/link';

export default function NewSupplierPage() {
  const router = useRouter();
  const { invalidate: invalidateSuppliers } = useSuppliersStore();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('bank.')) {
      const bankField = name.split('.')[1];
      setFormData({
        ...formData,
        bankDetails: {
          ...formData.bankDetails,
          [bankField]: value
        }
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Only name is mandatory
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Supplier Name is required';
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
      await suppliersAPI.create(formData);
      toast.success('Supplier added successfully!');
      invalidateSuppliers();
      router.push('/dashboard/suppliers');
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/suppliers" className="text-gray-600 hover:text-gray-900">
            <HiArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New Supplier</h1>
            <p className="text-gray-500 mt-1">Enter supplier details below</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6 text-black">
          {/* Basic Information */}
          <div >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={(e) => {
                    handleChange(e);
                    if (errors.name) {
                      setErrors({ ...errors, name: '' });
                    }
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 text-gray-900 placeholder-gray-500 ${errors.name
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-emerald-500'
                    }`}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <HiExclamation className="w-4 h-4 mr-1" />
                    {errors.name}
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
                  value={formData.contactPerson}
                  onChange={handleChange}
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
                  value={formData.phone}
                  onChange={handleChange}
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
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Tax Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GSTIN
                </label>
                <input
                  type="text"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}

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
                  value={formData.pan}
                  onChange={handleChange}
                  maxLength={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 uppercase text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
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
                    value={formData.city}
                    onChange={handleChange}
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
                    value={formData.state}
                    onChange={handleChange}
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
                    value={formData.pincode}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder-gray-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Terms</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </label>
                <select
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleChange}
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
                  value={formData.creditLimit}
                  onChange={handleChange}
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
                  value={formData.openingBalance}
                  onChange={handleChange}
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
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder-gray-500"
              placeholder="Any additional notes about this supplier..."
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Link
              href="/dashboard/suppliers"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
