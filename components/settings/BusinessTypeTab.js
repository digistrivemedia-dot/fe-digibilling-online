'use client';

import { useState, useEffect } from 'react';
import { HiCog, HiOfficeBuilding, HiSave, HiArchive, HiCube, HiLightningBolt, HiCollection } from 'react-icons/hi';
import { shopAPI } from '@/utils/api';
import { useToast } from '@/context/ToastContext';

// Derives enableProduct / enableService from a single selection key
const ITEM_MODES = [
    {
        id: 'product',
        label: 'Product',
        desc: 'Only product items in invoices & challans',
        icon: HiCube,
        color: 'border-blue-400 bg-blue-50',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        dot: 'border-blue-500 bg-blue-500',
    },
    {
        id: 'service',
        label: 'Service',
        desc: 'Only service items in invoices & challans',
        icon: HiLightningBolt,
        color: 'border-purple-400 bg-purple-50',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
        dot: 'border-purple-500 bg-purple-500',
    },
    {
        id: 'both',
        label: 'Product & Service',
        desc: 'Both products and services enabled',
        icon: HiCollection,
        color: 'border-orange-400 bg-orange-50',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
        dot: 'border-orange-500 bg-orange-500',
    },
];

export default function BusinessTypeTab() {
    const toast = useToast();
    const [itemMode, setItemMode] = useState('product'); // 'product' | 'service' | 'both'
    const [enableInventory, setEnableInventory] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        shopAPI.get().then(data => {
            const prod = data?.enableProduct !== false;   // default true
            const svc = data?.enableService === true;    // default false
            if (prod && svc) setItemMode('both');
            else if (svc) setItemMode('service');
            else setItemMode('product');
            if (data?.enableInventory !== undefined) setEnableInventory(data.enableInventory);
        }).catch(console.error);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await shopAPI.update({
                enableProduct: itemMode === 'product' || itemMode === 'both',
                enableService: itemMode === 'service' || itemMode === 'both',
                enableInventory,
            });
            toast.success('Settings saved!');
            window.dispatchEvent(new Event('shopSettingsUpdated'));
        } catch (error) {
            toast.error(error.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-black">
            <div className="flex items-center space-x-2 pb-4 border-b border-gray-200 mb-6">
                <HiOfficeBuilding className="w-5 h-5 text-orange-600" />
                <h2 className="text-xl font-bold text-gray-900">Business Type</h2>
            </div>

            {/* ── Item Type Section ────────────────────────────────── */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-1">
                    <HiCog className="w-4 h-4 text-orange-600" />
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Item Type</h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">Choose what kind of items your business deals with.</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {ITEM_MODES.map(({ id, label, desc, icon: Icon, color, iconBg, iconColor, dot }) => {
                        const active = itemMode === id;
                        return (
                            <button key={id} type="button" onClick={() => setItemMode(id)}
                                className={`relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all
                                    ${active ? color : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                                {/* Radio dot */}
                                <span className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center
                                    ${active ? dot : 'border-gray-300 bg-white'}`}>
                                    {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </span>
                                {/* Icon */}
                                <div className={`p-2 rounded-lg ${active ? iconBg : 'bg-gray-100'}`}>
                                    <Icon className={`w-5 h-5 ${active ? iconColor : 'text-gray-400'}`} />
                                </div>
                                {/* Text */}
                                <div>
                                    <p className={`text-sm font-semibold ${active ? 'text-gray-900' : 'text-gray-600'}`}>{label}</p>
                                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Divider ─────────────────────────────────────────── */}
            <div className="border-t border-gray-200 mb-8" />

            {/* ── Inventory Section ────────────────────────────────── */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <HiArchive className="w-4 h-4 text-green-600" />
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Inventory</h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">Control whether stock management is visible in the menu.</p>

                <label className={`flex items-center justify-between gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all select-none
                    ${enableInventory ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${enableInventory ? 'bg-green-100' : 'bg-gray-100'}`}>
                            <HiArchive className={`w-5 h-5 ${enableInventory ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <p className={`text-sm font-semibold ${enableInventory ? 'text-green-800' : 'text-gray-500'}`}>
                                {enableInventory ? 'Inventory Enabled' : 'Inventory Disabled'}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {enableInventory
                                    ? 'Inventory menu is visible — stock levels are tracked'
                                    : 'Inventory menu is hidden — no stock management'}
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={() => setEnableInventory(v => !v)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors
                            ${enableInventory ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                            ${enableInventory ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </label>
            </div>

            {/* Save */}
            <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
                <button type="button" disabled={saving} onClick={handleSave}
                    className="flex items-center px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl
                        hover:from-orange-700 hover:to-red-700 shadow-lg shadow-orange-500/30 transition-all
                        disabled:opacity-40 disabled:cursor-not-allowed">
                    <HiSave className="w-5 h-5 mr-2" />
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
}
