'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { servicesAPI } from '@/utils/api';
import { useServicesStore } from '@/store/useServicesStore';
import {
    HiLightningBolt,
    HiExclamation,
    HiArrowLeft,
    HiSave,
} from 'react-icons/hi';

const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28, 40];
const UNITS = ['ANN', 'BAG', 'BAL', 'BDL', 'BKL', 'BOTTLE', 'BOU', 'BOX', 'BTL', 'BUN', 'CAN', 'CBM', 'CCM', 'CMS', 'CTN', 'DAY', 'DAYS', 'DOZ', 'DRM', 'GGK', 'GM', 'GMS', 'GRS', 'GYD', 'HRS', 'JOB', 'KG', 'KGS', 'KLR', 'KME', 'LITRE', 'LTR', 'ML', 'MLT', 'MON', 'MONTHS', 'MTR', 'NOS', 'OTH', 'PAC', 'PCS', 'PKT', 'PRS', 'QTL', 'ROL', 'SET', 'SQF', 'SQM', 'SQY', 'STRIP', 'TBS', 'TGM', 'THD', 'TON', 'TUB', 'UGS', 'UNT', 'YDS'];

export default function EditService() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { id } = useParams();
    const { invalidate: invalidateServices } = useServicesStore();
    const toast = useToast();

    const [loadingService, setLoadingService] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        name: '',
        sacCode: '',
        gstRate: 18,
        rate: '',
        unit: 'NOS',
        description: '',
    });

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
            return;
        }
        if (!user || !id) return;

        const loadService = async () => {
            try {
                const data = await servicesAPI.getOne(id);
                setFormData({
                    name: data.name || '',
                    sacCode: data.sacCode || '',
                    gstRate: data.gstRate ?? 18,
                    rate: data.rate || '',
                    unit: data.unit || 'NOS',
                    description: data.description || '',
                });
            } catch (error) {
                toast.error('Failed to load service details');
                router.push('/dashboard/services');
            } finally {
                setLoadingService(false);
            }
        };

        loadService();
    }, [user, loading, id, router, toast]);

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
            toast.error('Please fix the errors before saving');
            return;
        }
        setSubmitting(true);
        try {
            await servicesAPI.update(id, formData);
            toast.success('Service updated successfully!');
            invalidateServices();
            router.push('/dashboard/services');
        } catch (error) {
            toast.error(error.message || 'Failed to update service');
        } finally {
            setSubmitting(false);
        }
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
            <div className="max-w-2xl mx-auto space-y-6">

                {/* ── Header ── */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/dashboard/services')}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                        title="Back to Services"
                    >
                        <HiArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg shadow-purple-500/40">
                            <HiLightningBolt className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Edit Service</h1>
                            <p className="mt-1 text-sm text-gray-500">Update service details</p>
                        </div>
                    </div>
                </div>

                {/* ── Form Card ── */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

                    {loadingService ? (
                        <div className="flex items-center justify-center py-20">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">

                            {/* Service Name */}
                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Service Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    className={fieldClass(errors.name)}
                                    placeholder="e.g. Consultation, Installation, Annual Maintenance"
                                    autoFocus
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-600 flex items-center mt-1">
                                        <HiExclamation className="w-4 h-4 mr-1" /> {errors.name}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

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
                                        SAC Code
                                        <span className="text-xs text-gray-400 font-normal ml-2">(Optional)</span>
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

                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Description
                                    <span className="text-xs text-gray-400 font-normal ml-2">(Optional)</span>
                                </label>
                                <textarea
                                    rows={4}
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    className={`${fieldClass()} resize-none`}
                                    placeholder="Brief description of this service…"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => router.push('/dashboard/services')}
                                    className="px-6 py-3 text-gray-700 font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <HiSave className="w-5 h-5 mr-2" />
                                    {submitting ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>

                        </form>
                    )}
                </div>

            </div>
        </DashboardLayout>
    );
}
