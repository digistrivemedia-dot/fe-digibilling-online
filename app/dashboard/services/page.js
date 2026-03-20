'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { servicesAPI } from '@/utils/api';
import {
    HiPlus,
    HiSearch,
    HiPencil,
    HiTrash,
    HiX,
    HiLightningBolt,
    HiExclamation,
} from 'react-icons/hi';

const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28, 40];

const UNITS = ['PCS', 'NOS', 'JOB', 'HRS', 'DAYS', 'MONTHS'];

const EMPTY_FORM = {
    name: '',
    sacCode: '',
    gstRate: 18,
    rate: '',
    unit: 'NOS',
    description: '',
};

export default function Services() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const toast = useToast();

    const [services, setServices] = useState([]);
    const [loadingServices, setLoadingServices] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState(EMPTY_FORM);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (user) {
            loadServices();
        }
    }, [user, loading, router]);

    const loadServices = async () => {
        try {
            const params = {};
            if (searchTerm && searchTerm.trim() !== '') {
                params.search = searchTerm;
            }
            const data = await servicesAPI.getAll(params);
            setServices(data);
        } catch (error) {
            console.error('Error loading services:', error);
            toast.error('Failed to load services');
        } finally {
            setLoadingServices(false);
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Service name is required';
        if (!formData.rate || parseFloat(formData.rate) <= 0)
            newErrors.rate = 'Rate is required and must be greater than 0';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) {
            toast.error('Please fill all required fields');
            return;
        }
        setSubmitting(true);
        try {
            // The modal is now only for adding new services
            await servicesAPI.create(formData);
            toast.success('Service added successfully!');
            closeModal();
            loadServices();
        } catch (error) {
            toast.error(error.message || 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (service) => {
        if (!confirm(`Delete service "${service.name}"? This action cannot be undone.`)) return;
        try {
            await servicesAPI.delete(service._id);
            toast.success('Service deleted successfully');
            loadServices();
        } catch (error) {
            toast.error(error.message || 'Failed to delete service');
        }
    };

    const openAddModal = () => {
        setFormData(EMPTY_FORM);
        setErrors({});
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setFormData(EMPTY_FORM);
        setErrors({});
    };

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    };

    const fieldClass = (err) =>
        `w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all text-black ${err
            ? 'border-red-400 focus:ring-red-400 focus:border-red-400 bg-red-50'
            : 'border-gray-300 focus:ring-purple-500 focus:border-transparent'
        }`;

    if (loading || !user) return null;

    return (
        <DashboardLayout>
            <div className="space-y-6">

                {/* ── Header ── */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg shadow-purple-500/40">
                            <HiLightningBolt className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Services</h1>
                            <p className="mt-1 text-sm text-gray-500">Manage your billable services &amp; SAC codes</p>
                        </div>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/40 hover:shadow-xl transition-all duration-200"
                    >
                        <HiPlus className="w-5 h-5 mr-2" />
                        Add Service
                    </button>
                </div>

                {/* ── Table card ── */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

                    {/* Search */}
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white">
                        <div className="relative">
                            <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search services by name or SAC code…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyUp={loadServices}
                                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-black"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    {loadingServices ? (
                        <div className="p-4">
                            <TableSkeleton rows={6} columns={6} />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Service</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SAC Code</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rate</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">GST</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {services.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="p-5 bg-purple-50 rounded-full mb-4">
                                                        <HiLightningBolt className="w-12 h-12 text-purple-300" />
                                                    </div>
                                                    <p className="text-gray-600 font-semibold text-lg">No services found</p>
                                                    <p className="text-gray-400 text-sm mt-1">Click <span className="font-medium text-purple-600">Add Service</span> to create your first service</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        services.map((service) => (
                                            <tr
                                                key={service._id}
                                                className="hover:bg-gradient-to-r hover:from-purple-50/40 hover:to-indigo-50/40 transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-semibold text-gray-900">{service.name}</div>
                                                    {service.description && (
                                                        <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{service.description}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                                                    {service.sacCode || <span className="text-gray-300 italic">—</span>}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                                    ₹{parseFloat(service.rate).toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700">
                                                        {service.unit || 'HRS'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700">
                                                        {service.gstRate}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Link
                                                            href={`/dashboard/services/${service._id}/edit`}
                                                            className="inline-flex items-center px-3 py-1.5 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all text-sm font-medium"
                                                        >
                                                            <HiPencil className="w-4 h-4 mr-1" />
                                                            Edit
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDelete(service)}
                                                            className="inline-flex items-center px-3 py-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all text-sm font-medium"
                                                        >
                                                            <HiTrash className="w-4 h-4 mr-1" />
                                                            Delete
                                                        </button>
                                                    </div>
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

            {/* ── Add / Edit Modal ── */}
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 sm:p-0">
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm transition-opacity"
                            onClick={closeModal}
                        />

                        {/* Panel */}
                        <div className="relative z-50 w-full max-w-2xl p-8 my-8 bg-white shadow-2xl rounded-3xl">
                            {/* Modal header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                                        <HiLightningBolt className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900">
                                        Add New Service
                                    </h3>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                                >
                                    <HiX className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                    {/* Service Name */}
                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="block text-sm font-semibold text-gray-700">
                                            Service Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                            className={fieldClass(errors.name)}
                                            placeholder="e.g. Consultation, Installation, Annual Maintenance"
                                        />
                                        {errors.name && (
                                            <p className="text-sm text-red-600 flex items-center mt-1">
                                                <HiExclamation className="w-4 h-4 mr-1" /> {errors.name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Rate */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-semibold text-gray-700">
                                            Rate (₹) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.rate}
                                            onChange={(e) => handleChange('rate', e.target.value)}
                                            className={fieldClass(errors.rate)}
                                            placeholder="0.00"
                                        />
                                        {errors.rate && (
                                            <p className="text-sm text-red-600 flex items-center mt-1">
                                                <HiExclamation className="w-4 h-4 mr-1" /> {errors.rate}
                                            </p>
                                        )}
                                    </div>

                                    {/* Unit */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-semibold text-gray-700">Unit</label>
                                        <select
                                            value={formData.unit}
                                            onChange={(e) => handleChange('unit', e.target.value)}
                                            className={fieldClass()}
                                        >
                                            {UNITS.map((u) => (
                                                <option key={u} value={u}>{u}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* SAC Code */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-semibold text-gray-700">
                                            SAC Code <span className="text-xs text-gray-400 ml-1">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.sacCode}
                                            onChange={(e) => handleChange('sacCode', e.target.value)}
                                            className={fieldClass()}
                                            placeholder="e.g. 998311"
                                        />
                                    </div>

                                    {/* GST Rate */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-semibold text-gray-700">GST Rate (%)</label>
                                        <select
                                            value={formData.gstRate}
                                            onChange={(e) => handleChange('gstRate', Number(e.target.value))}
                                            className={fieldClass()}
                                        >
                                            {GST_RATES.map((r) => (
                                                <option key={r} value={r}>{r}%</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Description */}
                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="block text-sm font-semibold text-gray-700">
                                            Description <span className="text-xs text-gray-400 ml-1">(Optional)</span>
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={formData.description}
                                            onChange={(e) => handleChange('description', e.target.value)}
                                            className={`${fieldClass()} resize-none`}
                                            placeholder="Brief description of this service…"
                                        />
                                    </div>
                                </div>

                                {/* Footer buttons */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-6 py-3 text-gray-700 font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submitting ? 'Saving…' : 'Add Service'}
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
