'use client';

import { useState, useEffect } from 'react';
import { HiDocument, HiCollection, HiCurrencyRupee, HiUpload, HiSave, HiTruck, HiClipboardList, HiInformationCircle, HiLocationMarker, HiHashtag, HiCalendar } from 'react-icons/hi';
import { useToast } from '@/context/ToastContext';
import { useShopStore } from '@/store/useShopStore';

const getInvoiceSettingsState = (shopSettings) => ({
    invoiceTemplate: shopSettings?.invoiceTemplate || 'our-format',
    ewayBill: shopSettings?.ewayBill ?? false,
    einvoice: shopSettings?.einvoice ?? false,
    billOfSupplyEnabled: shopSettings?.billOfSupplyEnabled ?? false,
    batchNumber: shopSettings?.invBatchNumber ?? false,
    expiryDate: shopSettings?.invExpiryDate ?? false,
    enableTransport: shopSettings?.enableTransport ?? false,
    enablePurchaseOrders: shopSettings?.enablePurchaseOrders ?? false,
    enableAdditionalDetails: shopSettings?.enableAdditionalDetails ?? false,
    enableShipTo: shopSettings?.enableShipTo ?? false,
    accountHolder: shopSettings?.invAccountHolder || '',
    bankName: shopSettings?.invBankName || '',
    accountNumber: shopSettings?.invAccountNumber || '',
    ifscCode: shopSettings?.invIfscCode || '',
    branchName: shopSettings?.invBranchName || '',
    qrCode: shopSettings?.invQrCode || '',
    invoiceTerms: shopSettings?.invoiceTerms || '',
});

export default function InvoiceSettingsTab() {
    const toast = useToast();
    const { shopSettings, updateShopSettings } = useShopStore();
    const [settings, setSettings] = useState(() => getInvoiceSettingsState(shopSettings));
    const [qrPreview, setQrPreview] = useState(shopSettings?.invQrCode || null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setSettings(getInvoiceSettingsState(shopSettings));
        setQrPreview(shopSettings?.invQrCode || null);
    }, [shopSettings]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateShopSettings({
                invoiceTemplate: settings.invoiceTemplate,
                ewayBill: settings.ewayBill,
                einvoice: settings.einvoice,
                billOfSupplyEnabled: settings.billOfSupplyEnabled,
                invBatchNumber: settings.batchNumber,
                invExpiryDate: settings.expiryDate,
                enableTransport: settings.enableTransport,
                enablePurchaseOrders: settings.enablePurchaseOrders,
                enableAdditionalDetails: settings.enableAdditionalDetails,
                enableShipTo: settings.enableShipTo,
                invAccountHolder: settings.accountHolder,
                invBankName: settings.bankName,
                invAccountNumber: settings.accountNumber,
                invIfscCode: settings.ifscCode,
                invBranchName: settings.branchName,
                invQrCode: settings.qrCode,
                invoiceTerms: settings.invoiceTerms,
            });
            toast.success('Invoice settings saved!');
        } catch (error) {
            toast.error(error.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const toggle = (key) => setSettings(p => ({ ...p, [key]: !p[key] }));
    const handleChange = (e) => setSettings(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleQrChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => { setQrPreview(reader.result); setSettings(p => ({ ...p, qrCode: reader.result })); };
        reader.readAsDataURL(file);
    };

    // Formatting toolbar helper — inserts prefix at each selected line or appends a new line
    const insertTermsFormat = (prefix) => {
        const textarea = document.getElementById('invoiceTermsArea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const current = settings.invoiceTerms || '';

        if (start === end) {
            // No selection — just insert a new line with the prefix
            const before = current.slice(0, start);
            const after = current.slice(end);
            const needsNewline = before.length > 0 && !before.endsWith('\n');
            const inserted = (needsNewline ? '\n' : '') + prefix;
            const newVal = before + inserted + after;
            setSettings(p => ({ ...p, invoiceTerms: newVal }));
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + inserted.length;
                textarea.focus();
            }, 0);
        } else {
            // Selection — prefix every line in the selection
            const before = current.slice(0, start);
            const selected = current.slice(start, end);
            const after = current.slice(end);
            const prefixed = selected.split('\n').map(line => prefix + line).join('\n');
            const newVal = before + prefixed + after;
            setSettings(p => ({ ...p, invoiceTerms: newVal }));
            setTimeout(() => {
                textarea.selectionStart = start;
                textarea.selectionEnd = start + prefixed.length;
                textarea.focus();
            }, 0);
        }
    };

    const insertNumberedList = () => {
        const textarea = document.getElementById('invoiceTermsArea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const current = settings.invoiceTerms || '';
        const before = current.slice(0, start);
        const selected = current.slice(start, end);
        const after = current.slice(end);
        const lines = selected ? selected.split('\n') : [''];
        const prefixed = lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
        const needsNewline = before.length > 0 && !before.endsWith('\n');
        const newVal = before + (needsNewline ? '\n' : '') + prefixed + after;
        setSettings(p => ({ ...p, invoiceTerms: newVal }));
        setTimeout(() => { textarea.focus(); }, 0);
    };

    const insertAlphaList = () => {
        const textarea = document.getElementById('invoiceTermsArea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const current = settings.invoiceTerms || '';
        const before = current.slice(0, start);
        const selected = current.slice(start, end);
        const after = current.slice(end);
        const lines = selected ? selected.split('\n') : [''];
        const prefixed = lines.map((line, i) => `${String.fromCharCode(65 + i)}. ${line}`).join('\n');
        const needsNewline = before.length > 0 && !before.endsWith('\n');
        const newVal = before + (needsNewline ? '\n' : '') + prefixed + after;
        setSettings(p => ({ ...p, invoiceTerms: newVal }));
        setTimeout(() => { textarea.focus(); }, 0);
    };

    const TEMPLATES = [
        {
            id: 'our-format',
            label: 'Classic Format',
            sub: 'Clean modern layout',
            svg: (
                <svg viewBox="0 0 160 200" className="w-full h-36" xmlns="http://www.w3.org/2000/svg">
                    <rect width="160" height="200" fill="white" stroke="#e5e7eb" strokeWidth="1" />
                    <rect x="8" y="8" width="20" height="20" rx="3" fill="#f97316" />
                    <rect x="32" y="10" width="50" height="6" rx="2" fill="#1f2937" />
                    <rect x="32" y="19" width="35" height="4" rx="2" fill="#9ca3af" />
                    <rect x="110" y="8" width="42" height="12" rx="3" fill="#3b82f6" />
                    <rect x="112" y="11" width="38" height="6" rx="1" fill="white" />
                    <rect x="90" y="24" width="62" height="5" rx="2" fill="#4b5563" />
                    <rect x="90" y="31" width="40" height="4" rx="2" fill="#9ca3af" />
                    <line x1="8" y1="42" x2="152" y2="42" stroke="#e5e7eb" strokeWidth="1" />
                    <rect x="8" y="46" width="22" height="4" rx="2" fill="#9ca3af" />
                    <rect x="8" y="53" width="55" height="5" rx="2" fill="#1f2937" />
                    <rect x="8" y="61" width="40" height="3" rx="2" fill="#9ca3af" />
                    <rect x="8" y="72" width="144" height="10" rx="2" fill="#f3f4f6" />
                    <rect x="10" y="75" width="15" height="4" rx="1" fill="#6b7280" />
                    <rect x="50" y="75" width="30" height="4" rx="1" fill="#6b7280" />
                    <rect x="100" y="75" width="20" height="4" rx="1" fill="#6b7280" />
                    <rect x="130" y="75" width="20" height="4" rx="1" fill="#6b7280" />
                    {[85, 96, 107].map((y, i) => (
                        <g key={i}>
                            <rect x="10" y={y} width="35" height="3" rx="1" fill="#d1d5db" />
                            <rect x="50" y={y} width="20" height="3" rx="1" fill="#d1d5db" />
                            <rect x="100" y={y} width="15" height="3" rx="1" fill="#d1d5db" />
                            <rect x="130" y={y} width="20" height="3" rx="1" fill="#d1d5db" />
                        </g>
                    ))}
                    <line x1="8" y1="118" x2="152" y2="118" stroke="#e5e7eb" strokeWidth="0.5" />
                    <rect x="100" y="122" width="30" height="4" rx="1" fill="#9ca3af" />
                    <rect x="130" y="122" width="20" height="4" rx="1" fill="#1f2937" />
                    <rect x="8" y="136" width="144" height="8" rx="2" fill="#1f2937" />
                    <rect x="100" y="138" width="25" height="4" rx="1" fill="#f97316" />
                    <rect x="128" y="138" width="20" height="4" rx="1" fill="white" />
                    <rect x="8" y="152" width="80" height="3" rx="1" fill="#e5e7eb" />
                    <rect x="40" y="188" width="80" height="4" rx="2" fill="#f97316" opacity="0.4" />
                </svg>
            ),
        },
        {
            id: 'tally-portrait',
            label: 'Modern Format',
            sub: 'Market standard · Portrait',
            svg: (
                <svg viewBox="0 0 160 200" className="w-full h-36" xmlns="http://www.w3.org/2000/svg">
                    <rect width="160" height="200" fill="white" stroke="#e5e7eb" strokeWidth="1" />
                    <rect x="45" y="8" width="70" height="6" rx="2" fill="#374151" />
                    <rect x="110" y="8" width="42" height="5" rx="1" fill="#9ca3af" />
                    <rect x="6" y="18" width="148" height="28" fill="none" stroke="#9ca3af" strokeWidth="0.8" />
                    <line x1="80" y1="18" x2="80" y2="46" stroke="#9ca3af" strokeWidth="0.5" />
                    <rect x="8" y="21" width="40" height="4" rx="1" fill="#374151" />
                    <rect x="8" y="27" width="60" height="3" rx="1" fill="#9ca3af" />
                    <rect x="8" y="33" width="50" height="3" rx="1" fill="#9ca3af" />
                    <rect x="82" y="27" width="35" height="3" rx="1" fill="#374151" />
                    <rect x="82" y="33" width="25" height="3" rx="1" fill="#9ca3af" />
                    <rect x="6" y="48" width="148" height="90" fill="none" stroke="#9ca3af" strokeWidth="0.8" />
                    <line x1="6" y1="56" x2="154" y2="56" stroke="#9ca3af" strokeWidth="0.5" />
                    <rect x="8" y="50" width="8" height="4" rx="1" fill="#6b7280" />
                    <rect x="20" y="50" width="45" height="4" rx="1" fill="#6b7280" />
                    <rect x="80" y="50" width="15" height="4" rx="1" fill="#6b7280" />
                    <rect x="135" y="50" width="17" height="4" rx="1" fill="#6b7280" />
                    {[18, 78, 98, 118, 133].map(x => (<line key={x} x1={x} y1="48" x2={x} y2="138" stroke="#9ca3af" strokeWidth="0.5" />))}
                    {[62, 72, 82, 92, 102].map((y, i) => (
                        <g key={i}>
                            <rect x="8" y={y} width="8" height="3" rx="1" fill="#d1d5db" />
                            <rect x="20" y={y} width="50" height="3" rx="1" fill="#d1d5db" />
                            <rect x="135" y={y} width="15" height="3" rx="1" fill="#d1d5db" />
                        </g>
                    ))}
                    <line x1="6" y1="128" x2="154" y2="128" stroke="#9ca3af" strokeWidth="0.5" />
                    <rect x="135" y="131" width="15" height="3" rx="1" fill="#374151" />
                    <rect x="6" y="140" width="148" height="10" fill="none" stroke="#9ca3af" strokeWidth="0.8" />
                    <rect x="8" y="143" width="80" height="4" rx="1" fill="#374151" />
                    <rect x="6" y="152" width="148" height="22" fill="none" stroke="#9ca3af" strokeWidth="0.8" />
                    <rect x="6" y="176" width="148" height="18" fill="none" stroke="#9ca3af" strokeWidth="0.8" />
                    <rect x="8" y="186" width="50" height="3" rx="1" fill="#d1d5db" />
                    <rect x="100" y="186" width="50" height="3" rx="1" fill="#9ca3af" />
                </svg>
            ),
        },
        {
            id: 'tally-landscape',
            label: 'Modern landscape Format',
            sub: 'Market standard · Wide',
            svg: (
                <svg viewBox="0 0 200 160" className="w-full h-36" xmlns="http://www.w3.org/2000/svg">
                    <rect width="200" height="160" fill="white" stroke="#e5e7eb" strokeWidth="1" />
                    <rect x="65" y="6" width="70" height="6" rx="2" fill="#374151" />
                    <rect x="155" y="6" width="40" height="5" rx="1" fill="#9ca3af" />
                    <rect x="6" y="16" width="188" height="28" fill="none" stroke="#9ca3af" strokeWidth="0.8" />
                    <line x1="100" y1="16" x2="100" y2="44" stroke="#9ca3af" strokeWidth="0.5" />
                    <rect x="8" y="19" width="50" height="4" rx="1" fill="#374151" />
                    <rect x="8" y="25" width="75" height="3" rx="1" fill="#9ca3af" />
                    <rect x="102" y="25" width="50" height="3" rx="1" fill="#374151" />
                    <rect x="102" y="31" width="30" height="3" rx="1" fill="#9ca3af" />
                    <rect x="6" y="46" width="188" height="70" fill="none" stroke="#9ca3af" strokeWidth="0.8" />
                    <line x1="6" y1="54" x2="194" y2="54" stroke="#9ca3af" strokeWidth="0.5" />
                    {[20, 55, 85, 105, 125, 145, 165, 182].map(x => (<line key={x} x1={x} y1="46" x2={x} y2="116" stroke="#9ca3af" strokeWidth="0.4" />))}
                    <rect x="8" y="48" width="10" height="4" rx="1" fill="#6b7280" />
                    <rect x="22" y="48" width="30" height="4" rx="1" fill="#6b7280" />
                    <rect x="167" y="48" width="25" height="4" rx="1" fill="#6b7280" />
                    {[60, 68, 76, 84, 92, 100, 108].map((y, i) => (
                        <g key={i}>
                            <rect x="8" y={y} width="10" height="3" rx="1" fill="#d1d5db" />
                            <rect x="22" y={y} width="30" height="3" rx="1" fill="#d1d5db" />
                            <rect x="167" y={y} width="20" height="3" rx="1" fill="#d1d5db" />
                        </g>
                    ))}
                    <line x1="6" y1="108" x2="194" y2="108" stroke="#9ca3af" strokeWidth="0.5" />
                    <rect x="167" y="110" width="25" height="3" rx="1" fill="#374151" />
                    <rect x="6" y="118" width="188" height="8" fill="none" stroke="#9ca3af" strokeWidth="0.8" />
                    <rect x="6" y="128" width="188" height="26" fill="none" stroke="#9ca3af" strokeWidth="0.8" />
                    <rect x="130" y="132" width="60" height="3" rx="1" fill="#9ca3af" />
                </svg>
            ),
        },
        {
            id: 'thermal-receipt',
            label: 'Thermal Receipt',
            sub: 'POS/Grocery · 80mm',
            svg: (
                <svg viewBox="0 0 100 200" className="w-full h-36" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="200" fill="white" stroke="#e5e7eb" strokeWidth="1" />
                    <rect x="25" y="6" width="50" height="6" rx="2" fill="#374151" />
                    <rect x="15" y="14" width="70" height="3" rx="1" fill="#9ca3af" />
                    <rect x="20" y="19" width="60" height="2.5" rx="1" fill="#d1d5db" />
                    <rect x="18" y="23" width="64" height="2.5" rx="1" fill="#d1d5db" />
                    <line x1="10" y1="30" x2="90" y2="30" stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="2,2" />
                    <rect x="12" y="34" width="40" height="3" rx="1" fill="#6b7280" />
                    <rect x="65" y="34" width="23" height="3" rx="1" fill="#6b7280" />
                    {[40, 46, 52, 58, 64, 70, 76, 82, 88, 94, 100, 106].map((y) => (
                        <g key={y}>
                            <rect x="12" y={y} width="45" height="2.5" rx="1" fill="#d1d5db" />
                            <rect x="60" y={y} width="28" height="2.5" rx="1" fill="#d1d5db" />
                        </g>
                    ))}
                    <line x1="10" y1="112" x2="90" y2="112" stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="2,2" />
                    <rect x="12" y="116" width="40" height="3" rx="1" fill="#6b7280" />
                    <rect x="65" y="116" width="23" height="3" rx="1" fill="#6b7280" />
                    <rect x="12" y="122" width="40" height="3" rx="1" fill="#6b7280" />
                    <rect x="65" y="122" width="23" height="3" rx="1" fill="#6b7280" />
                    <rect x="12" y="128" width="40" height="3" rx="1" fill="#6b7280" />
                    <rect x="65" y="128" width="23" height="3" rx="1" fill="#6b7280" />
                    <line x1="10" y1="136" x2="90" y2="136" stroke="#374151" strokeWidth="1" />
                    <rect x="12" y="140" width="30" height="4" rx="1" fill="#374151" />
                    <rect x="60" y="140" width="28" height="4" rx="1" fill="#374151" />
                    <line x1="10" y1="150" x2="90" y2="150" stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="2,2" />
                    <rect x="25" y="155" width="50" height="2.5" rx="1" fill="#9ca3af" />
                    <rect x="30" y="160" width="40" height="2" rx="1" fill="#d1d5db" />
                    <rect x="28" y="165" width="44" height="2" rx="1" fill="#d1d5db" />
                </svg>
            ),
        },
    ];

    const ITEM_FIELDS = [
        {
            key: 'batchNumber',
            label: 'Batch Number',
            desc: 'Track batch numbers on each line item',
            icon: <HiHashtag className="w-5 h-5 text-blue-500" />,
        },
        {
            key: 'expiryDate',
            label: 'Expiry Date',
            desc: 'Track expiry dates on each line item',
            icon: <HiCalendar className="w-5 h-5 text-red-400" />,
        },
        {
            key: 'enableTransport',
            label: 'Transport Details',
            desc: 'Show transportation info section',
            icon: <HiTruck className="w-5 h-5 text-green-500" />,
        },
        {
            key: 'enablePurchaseOrders',
            label: 'Purchase Orders',
            desc: 'Show PO number & date fields',
            icon: <HiClipboardList className="w-5 h-5 text-yellow-500" />,
        },
        {
            key: 'enableAdditionalDetails',
            label: 'Additional Invoice Details',
            desc: 'Show extra reference fields (E-Way Bill, Delivery Note, etc.)',
            icon: <HiInformationCircle className="w-5 h-5 text-gray-500" />,
        },
        {
            key: 'enableShipTo',
            label: 'Ship To',
            desc: 'Show a separate shipping address section on the invoice',
            icon: <HiLocationMarker className="w-5 h-5 text-blue-500" />,
        },
    ];

    const BANK_FIELDS = [
        { name: 'accountHolder', label: 'Account Holder Name', placeholder: 'e.g. ABC Enterprises' },
        { name: 'bankName', label: 'Bank Name', placeholder: 'e.g. State Bank of India' },
        { name: 'accountNumber', label: 'Account Number', placeholder: 'e.g. 1234567890' },
        { name: 'ifscCode', label: 'IFSC Code', placeholder: 'e.g. SBIN0001234' },
        { name: 'branchName', label: 'Branch Name', placeholder: 'e.g. MG Road, Bangalore' },
    ];

    return (
        <div className="space-y-6 text-black">

            {/* Template Chooser */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center space-x-2 pb-4 border-b border-gray-200 mb-5">
                    <HiDocument className="w-5 h-5 text-orange-500" />
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Choose Invoice Template</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Select the print layout for your invoices</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {TEMPLATES.map(({ id, label, sub, svg }) => {
                        const active = settings.invoiceTemplate === id;
                        return (
                            <label key={id} className={`cursor-pointer relative flex flex-col rounded-xl border-2 overflow-hidden transition-all ${active ? 'border-orange-500 shadow-md shadow-orange-100' : 'border-gray-200 hover:border-orange-300'}`}>
                                <input type="radio" name="invoiceTemplate" value={id} checked={active}
                                    onChange={() => setSettings(p => ({ ...p, invoiceTemplate: id }))} className="sr-only" />
                                <div className="bg-gray-50 p-3 border-b border-gray-100">{svg}</div>
                                <div className="p-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">{label}</p>
                                        <p className="text-xs text-gray-400">{sub}</p>
                                    </div>
                                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${active ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                                        {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </span>
                                </div>
                                {active && <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">✓ Selected</div>}
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Compliance Toggles */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center space-x-2 pb-4 border-b border-gray-200 mb-5">
                    <HiDocument className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-bold text-gray-900">Compliance Settings</h2>
                </div>
                <div className="space-y-4">
                    {[
                        { key: 'ewayBill', label: 'E-way Bill', desc: 'Enable E-way Bill generation for applicable invoices' },
                        { key: 'einvoice', label: 'E-Invoice', desc: 'Enable E-Invoice (IRN) generation via government portal' },
                        { key: 'billOfSupplyEnabled', label: 'Bill of Supply', desc: 'Enable Bill of Supply document type in invoice creation (for exempt / composition scheme sales)' },
                    ].map(({ key, label, desc }) => (
                        <div key={key} className="flex items-start justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                            </div>
                            <button type="button" onClick={() => toggle(key)}
                                className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${settings[key] ? 'bg-orange-500' : 'bg-gray-200'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Item Fields */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center space-x-2 pb-4 border-b border-gray-200 mb-5">
                    <HiCollection className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-bold text-gray-900">In-Invoice Item Fields</h2>
                </div>
                <p className="text-xs text-gray-500 mb-5">Control which sections appear when creating an invoice.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ITEM_FIELDS.map(({ key, label, desc, icon }) => (
                        <label key={key}
                            className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${settings[key]
                                ? 'border-orange-400 bg-orange-50'
                                : 'border-gray-200 bg-gray-50 hover:border-orange-200'
                                }`}>
                            <input type="checkbox" checked={settings[key]} onChange={() => toggle(key)}
                                className="w-4 h-4 accent-orange-500 rounded mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    {icon}
                                    <span className={`text-sm font-semibold ${settings[key] ? 'text-orange-700' : 'text-gray-700'}`}>{label}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Bank Details */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center space-x-2 pb-4 border-b border-gray-200 mb-5">
                    <HiCurrencyRupee className="w-5 h-5 text-green-600" />
                    <h2 className="text-lg font-bold text-gray-900">Bank Details</h2>
                </div>
                <p className="text-xs text-gray-500 mb-4">These details will appear at the bottom of your invoices for payment reference.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {BANK_FIELDS.map(({ name, label, placeholder }) => (
                        <div key={name} className="space-y-1.5">
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
                            <input type="text" name={name} value={settings[name]} onChange={handleChange} placeholder={placeholder}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" />
                        </div>
                    ))}
                    {/* QR */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">QR Code (Payment)</label>
                        <div className="flex items-center gap-3">
                            <label className="cursor-pointer">
                                <input type="file" accept="image/*" onChange={handleQrChange} className="hidden" />
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-all">
                                    <HiUpload className="w-4 h-4" />
                                    {qrPreview ? 'Change QR' : 'Upload QR'}
                                </div>
                            </label>
                            {qrPreview && (
                                <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={qrPreview} alt="QR" className="w-12 h-12 object-contain border border-gray-200 rounded-lg" />
                                    <button type="button" onClick={() => { setQrPreview(null); setSettings(p => ({ ...p, qrCode: '' })); }}
                                        className="text-xs text-red-500 hover:text-red-700">Remove</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Terms & Conditions */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center space-x-2 pb-4 border-b border-gray-200 mb-4">
                    <HiDocument className="w-5 h-5 text-blue-600" />
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Invoice Terms & Conditions</h2>
                        <p className="text-xs text-gray-400 mt-0.5">These will appear at the bottom of every invoice</p>
                    </div>
                </div>

                {/* Formatting Toolbar */}
                <div className="flex flex-wrap items-center gap-2 mb-3 p-2 bg-gray-50 border border-gray-200 rounded-xl">
                    <span className="text-xs font-semibold text-gray-500 mr-1">Insert:</span>

                    <button type="button"
                        onClick={() => insertTermsFormat('• ')}
                        title="Add bullet point"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all shadow-sm">
                        <span className="text-base leading-none">•</span> Bullet Point
                    </button>

                    <div className="flex-1" />

                    {settings.invoiceTerms && (
                        <button type="button"
                            onClick={() => setSettings(p => ({ ...p, invoiceTerms: '' }))}
                            className="px-2.5 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all">
                            Clear
                        </button>
                    )}
                </div>

                {/* Tip */}
                <p className="text-xs text-gray-400 mb-2">
                    💡 Tip: Select lines of text before clicking a button to format them, or click to insert at cursor.
                </p>

                <textarea
                    id="invoiceTermsArea"
                    name="invoiceTerms"
                    value={settings.invoiceTerms}
                    onChange={handleChange}
                    rows={7}
                    placeholder={`e.g.\n• Goods once sold will not be returned.\n• Payment due within 30 days.\n• Subject to local jurisdiction.`}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-mono leading-relaxed resize-y"
                    style={{ whiteSpace: 'pre-wrap' }}
                />

                {/* Live Preview */}
                {settings.invoiceTerms && (
                    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preview (as it will appear on invoice)</p>
                        <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{settings.invoiceTerms}</p>
                    </div>
                )}
            </div>

            {/* Save */}
            <div className="flex justify-end">
                <button type="button" disabled={saving} onClick={handleSave}
                    className="flex items-center px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-red-700 shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50">
                    <HiSave className="w-5 h-5 mr-2" />{saving ? 'Saving...' : 'Save Invoice Settings'}
                </button>
            </div>
        </div>
    );
}
