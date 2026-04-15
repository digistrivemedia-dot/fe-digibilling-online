'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { shopAPI } from '@/utils/api';
import { useShopStore } from '@/store/useShopStore';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
    HiOfficeBuilding, HiUser, HiPhone, HiMail, HiLocationMarker,
    HiDocument, HiExclamation, HiPhotograph, HiUpload, HiSave,
    HiCheckCircle, HiExclamationCircle,
} from 'react-icons/hi';

export default function ShopSettingsTab() {
    const toast = useToast();
    const { shopSettings, fetchShopSettings, invalidate: invalidateShop } = useShopStore();
    const [formData, setFormData] = useState({
        shopName: '',
        ownerName: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        email: '',
        gstin: '',
        defaultTaxType: 'CGST_SGST',
        gstScheme: 'REGULAR',
        logo: '',
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [errors, setErrors] = useState({});
    const [logoPreview, setLogoPreview] = useState(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    useEffect(() => {
        fetchShopSettings();
    }, []);

    useEffect(() => {
        if (shopSettings) {
            setFormData({
                shopName: shopSettings.shopName || '',
                ownerName: shopSettings.ownerName || '',
                address: shopSettings.address || '',
                city: shopSettings.city || '',
                state: shopSettings.state || '',
                pincode: shopSettings.pincode || '',
                phone: shopSettings.phone || '',
                email: shopSettings.email || '',
                gstin: shopSettings.gstin || '',
                defaultTaxType: shopSettings.defaultTaxType || 'CGST_SGST',
                gstScheme: shopSettings.gstScheme || 'REGULAR',
                logo: shopSettings.logo || '',
            });
            if (shopSettings.logo) setLogoPreview(shopSettings.logo);
        }
    }, [shopSettings]);

    const handleLogoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            toast.error('Please upload only PNG or JPEG images');
            e.target.value = '';
            return;
        }
        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error('Logo size must be less than 2MB');
            e.target.value = '';
            return;
        }
        setUploadingLogo(true);
        try {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result;
                setLogoPreview(base64String);
                setFormData(prev => ({ ...prev, logo: base64String }));
                setUploadingLogo(false);
                toast.success('Logo uploaded successfully');
            };
            reader.onerror = () => {
                toast.error('Error reading file');
                setUploadingLogo(false);
            };
            reader.readAsDataURL(file);
        } catch {
            toast.error('Error uploading logo');
            setUploadingLogo(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.shopName?.trim()) newErrors.shopName = 'Shop Name is required';
        if (!formData.ownerName?.trim()) newErrors.ownerName = 'Owner Name is required';
        if (!formData.phone?.trim()) newErrors.phone = 'Phone Number is required';
        if (!formData.email?.trim()) newErrors.email = 'Email is required';
        if (!formData.address?.trim()) newErrors.address = 'Address is required';
        if (!formData.city?.trim()) newErrors.city = 'City is required';
        if (!formData.state?.trim()) newErrors.state = 'State is required';
        if (!formData.pincode?.trim()) newErrors.pincode = 'Pincode is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) { toast.error('Please fill all required fields'); return; }
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await shopAPI.update(formData);
            invalidateShop();
            if (formData.shopName) document.title = `${formData.shopName} - Billing Software`;
            setMessage({ type: 'success', text: 'Settings saved successfully!' });
            toast.success('Settings saved successfully!');
            window.dispatchEvent(new CustomEvent('shopSettingsUpdated'));
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
            toast.error(error.message || 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const fieldClass = (err) =>
        `w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all ${err ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-orange-500 focus:border-transparent'
        }`;

    return (
        <>
            {/* Success/Error Message */}
            {message.text && (
                <div className={`mb-6 p-4 rounded-xl border-l-4 flex items-start space-x-3 ${message.type === 'success'
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500'
                        : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-500'
                    }`}>
                    {message.type === 'success'
                        ? <HiCheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                        : <HiExclamationCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />}
                    <p className={`font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                        {message.text}
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-8 text-black">

                {/* Basic Info */}
                <div className="space-y-6">
                    <div className="flex items-center space-x-2 pb-4 border-b border-gray-200">
                        <HiOfficeBuilding className="w-5 h-5 text-blue-600" />
                        <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

                        {/* Shop Name */}
                        <div className="sm:col-span-2 space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">Shop Name <span className="text-red-500">*</span></label>
                            <input type="text" name="shopName" value={formData.shopName} onChange={handleChange}
                                className={fieldClass(errors.shopName)} placeholder="ABC Medical Store" />
                            {errors.shopName && <p className="text-sm text-red-600 flex items-center mt-1"><HiExclamation className="w-4 h-4 mr-1" />{errors.shopName}</p>}
                        </div>

                        {/* Owner Name */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">Owner Name <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><HiUser className="h-5 w-5 text-gray-400" /></div>
                                <input type="text" name="ownerName" value={formData.ownerName} onChange={handleChange}
                                    className={`pl-12 pr-4 ${fieldClass(errors.ownerName)}`} placeholder="John Doe" />
                            </div>
                            {errors.ownerName && <p className="text-sm text-red-600 flex items-center mt-1"><HiExclamation className="w-4 h-4 mr-1" />{errors.ownerName}</p>}
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">Phone <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><HiPhone className="h-5 w-5 text-gray-400" /></div>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                                    className={`pl-12 pr-4 ${fieldClass(errors.phone)}`} placeholder="9876543210" />
                            </div>
                            {errors.phone && <p className="text-sm text-red-600 flex items-center mt-1"><HiExclamation className="w-4 h-4 mr-1" />{errors.phone}</p>}
                        </div>

                        {/* Email */}
                        <div className="sm:col-span-2 space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">Email <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><HiMail className="h-5 w-5 text-gray-400" /></div>
                                <input type="email" name="email" value={formData.email} onChange={handleChange}
                                    className={`pl-12 pr-4 ${fieldClass(errors.email)}`} placeholder="shop@example.com" />
                            </div>
                            {errors.email && <p className="text-sm text-red-600 flex items-center mt-1"><HiExclamation className="w-4 h-4 mr-1" />{errors.email}</p>}
                        </div>
                    </div>
                </div>

                {/* Logo */}
                <div className="space-y-6">
                    <div className="flex items-center space-x-2 pb-4 border-b border-gray-200">
                        <HiPhotograph className="w-5 h-5 text-green-600" />
                        <h2 className="text-xl font-bold text-gray-900">Shop Logo</h2>
                    </div>
                    <div className="flex items-start space-x-6">
                        <div className="flex-shrink-0">
                            <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden">
                                {/* eslint-disable @next/next/no-img-element */}
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Shop Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <div className="text-center">
                                        <HiPhotograph className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                        <p className="text-xs text-gray-500">No logo</p>
                                    </div>
                                )}
                                {/* eslint-enable @next/next/no-img-element */}
                            </div>
                        </div>
                        <div className="flex-1 space-y-3">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Logo</label>
                                <p className="text-xs text-gray-500 mb-3">Max size: 2MB. Formats: PNG, JPG, JPEG</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <label className="cursor-pointer">
                                    <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleLogoChange} className="hidden" disabled={uploadingLogo} />
                                    <div className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md">
                                        {uploadingLogo ? (<><LoadingSpinner size="sm" text="" /><span className="ml-2">Uploading...</span></>) : (<><HiUpload className="w-4 h-4 mr-2" />Choose Logo</>)}
                                    </div>
                                </label>
                                {logoPreview && (
                                    <button type="button" onClick={() => { setLogoPreview(null); setFormData(p => ({ ...p, logo: '' })); toast.success('Logo removed'); }}
                                        className="px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 transition-all">
                                        Remove Logo
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Address */}
                <div className="space-y-6">
                    <div className="flex items-center space-x-2 pb-4 border-b border-gray-200">
                        <HiLocationMarker className="w-5 h-5 text-purple-600" />
                        <h2 className="text-xl font-bold text-gray-900">Address Details</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

                        <div className="sm:col-span-2 space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">Address <span className="text-red-500">*</span></label>
                            <input type="text" name="address" value={formData.address} onChange={handleChange}
                                className={fieldClass(errors.address)} placeholder="123, Main Street" />
                            {errors.address && <p className="text-sm text-red-600 flex items-center mt-1"><HiExclamation className="w-4 h-4 mr-1" />{errors.address}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">City <span className="text-red-500">*</span></label>
                            <input type="text" name="city" value={formData.city} onChange={handleChange}
                                className={fieldClass(errors.city)} placeholder="Mumbai" />
                            {errors.city && <p className="text-sm text-red-600 flex items-center mt-1"><HiExclamation className="w-4 h-4 mr-1" />{errors.city}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">State <span className="text-red-500">*</span></label>
                            <input type="text" name="state" value={formData.state} onChange={handleChange}
                                className={fieldClass(errors.state)} placeholder="Maharashtra" />
                            {errors.state && <p className="text-sm text-red-600 flex items-center mt-1"><HiExclamation className="w-4 h-4 mr-1" />{errors.state}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">Pincode <span className="text-red-500">*</span></label>
                            <input type="text" name="pincode" value={formData.pincode} onChange={handleChange}
                                className={fieldClass(errors.pincode)} placeholder="400001" maxLength={6} />
                            {errors.pincode && <p className="text-sm text-red-600 flex items-center mt-1"><HiExclamation className="w-4 h-4 mr-1" />{errors.pincode}</p>}
                        </div>
                    </div>
                </div>

                {/* Tax & Legal */}
                <div className="space-y-6">
                    <div className="flex items-center space-x-2 pb-4 border-b border-gray-200">
                        <HiDocument className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-xl font-bold text-gray-900">Tax & Legal Information</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">GSTIN</label>
                            <input type="text" name="gstin" value={formData.gstin} onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all uppercase"
                                placeholder="22AAAAA0000A1Z5" maxLength={15} />
                        </div>

                        {/* GST Scheme Toggle */}
                        <div className="col-span-2 space-y-3">
                            <label className="block text-sm font-semibold text-gray-700">GST Scheme</label>
                            <div className="flex items-center gap-3">
                                {[
                                    { id: 'REGULAR', label: 'Regular GST / Tax Invoice', icon: '🧾' },
                                    { id: 'COMPOSITION', label: 'Composition Scheme / Bill of Supply', icon: '📄' },
                                ].map(({ id, label, icon }) => {
                                    const active = formData.gstScheme === id;
                                    return (
                                        <label
                                            key={id}
                                            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border-2 cursor-pointer transition-all select-none ${active
                                                ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm shadow-orange-100'
                                                : 'border-gray-200 bg-white text-gray-500 hover:border-orange-300 hover:text-gray-700'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="gstScheme"
                                                value={id}
                                                checked={active}
                                                onChange={handleChange}
                                                className="sr-only"
                                            />
                                            <span className="text-base">{icon}</span>
                                            <span className="text-sm font-semibold">{label}</span>
                                            {/* dot indicator */}
                                            <span className={`ml-1 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${active ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                                                }`}>
                                                {active && <span className="w-1 h-1 rounded-full bg-white" />}
                                            </span>
                                        </label>
                                    );
                                })}

                                {/* Subtle info badge */}
                                <span className="ml-2 text-xs text-gray-400">
                                    {formData.gstScheme === 'REGULAR'
                                        ? 'GST applicable — CGST/SGST or IGST will be charged'
                                        : 'No GST — used for composition scheme / exempt sales'}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">Default Tax Type</label>
                            <select name="defaultTaxType" value={formData.defaultTaxType} onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white">
                                <option value="CGST_SGST">CGST + SGST (Same State)</option>
                                <option value="IGST">IGST (Different State)</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">This will be the default tax type for new invoices</p>
                        </div>


                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-6 border-t border-gray-200">
                    <button type="submit" disabled={saving}
                        className="flex items-center px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 shadow-lg shadow-orange-500/50 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {saving
                            ? (<><LoadingSpinner size="sm" text="" /><span className="ml-2">Saving...</span></>)
                            : (<><HiSave className="w-5 h-5 mr-2" />Save Settings</>)}
                    </button>
                </div>
            </form>
        </>
    );
}
