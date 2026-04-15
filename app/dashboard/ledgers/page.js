'use client';
// Ledgers & Accounting Page - Refactored with Component Architecture
import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import { HiDownload, HiDocumentReport } from 'react-icons/hi';
import { useShopStore } from '@/store/useShopStore';
import * as XLSX from 'xlsx';

// Import all ledger tab components
import CustomerLedgerTab from '@/components/ledgers/CustomerLedgerTab';
import SupplierLedgerTab from '@/components/ledgers/SupplierLedgerTab';
import CashLedgerTab from '@/components/ledgers/CashLedgerTab';
import BankLedgerTab from '@/components/ledgers/BankLedgerTab';
import TrialBalanceTab from '@/components/ledgers/TrialBalanceTab';
import PLStatementTab from '@/components/ledgers/PLStatementTab';
import BalanceSheetTab from '@/components/ledgers/BalanceSheetTab';

export default function LedgersPage() {
    const toast = useToast();
    const { shopSettings, fetchShopSettings } = useShopStore();
    const shopName = shopSettings?.shopName || 'Billing Software';
    const [activeTab, setActiveTab] = useState('customerLedger');
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchShopSettings();
    }, []);

    const tabs = [
        { id: 'customerLedger', name: 'Customer Ledger', description: 'Receivables' },
        { id: 'supplierLedger', name: 'Supplier Ledger', description: 'Payables' },
        { id: 'cashLedger', name: 'Cash Ledger', description: 'Cash Book' },
        { id: 'bankLedger', name: 'Bank Ledger', description: 'Bank Book' },
        { id: 'trialBalance', name: 'Trial Balance', description: 'All Accounts' },
        { id: 'profitLoss', name: 'P&L Statement', description: 'Income & Expenses' },
        { id: 'balanceSheet', name: 'Balance Sheet', description: 'Assets & Liabilities' }
    ];

    const handleExportToExcel = () => {
        // Get the current tab content
        const element = document.querySelector('.bg-white.rounded-lg.shadow-sm');
        if (!element) {
            toast.error('No data to export');
            return;
        }

        try {
            // Find all tables in the current view
            const tables = element.querySelectorAll('table');
            if (tables.length === 0) {
                toast.warning('No table data available to export');
                return;
            }

            // Create a new workbook
            const wb = XLSX.utils.book_new();

            // Get the active tab name
            const activeTabName = tabs.find(t => t.id === activeTab)?.name || 'Ledger';

            // Export each table as a separate sheet
            tables.forEach((table, index) => {
                const ws = XLSX.utils.table_to_sheet(table);
                const sheetName = tables.length > 1 ? `${activeTabName}_${index + 1}` : activeTabName;
                XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // Excel sheet name limit
            });

            // Generate filename with date
            const filename = `${activeTabName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

            // Save the file
            XLSX.writeFile(wb, filename);
            toast.success(`Exported to ${filename}`);
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export to Excel');
        }
    };

    const handleExportToPDF = () => {
        try {
            // Hide no-print elements
            const noPrintElements = document.querySelectorAll('.no-print');
            noPrintElements.forEach(el => el.style.display = 'none');

            // Trigger browser print dialog
            window.print();

            // Restore no-print elements
            setTimeout(() => {
                noPrintElements.forEach(el => el.style.display = '');
            }, 100);

            toast.success('Print dialog opened');
        } catch (error) {
            console.error('Print error:', error);
            toast.error('Failed to open print dialog');
        }
    };

    // Render the active tab component
    const renderTabContent = () => {
        switch (activeTab) {
            case 'customerLedger':
                return <CustomerLedgerTab dateRange={dateRange} setDateRange={setDateRange} />;
            case 'supplierLedger':
                return <SupplierLedgerTab dateRange={dateRange} setDateRange={setDateRange} />;
            case 'cashLedger':
                return <CashLedgerTab dateRange={dateRange} setDateRange={setDateRange} />;
            case 'bankLedger':
                return <BankLedgerTab dateRange={dateRange} setDateRange={setDateRange} />;
            case 'trialBalance':
                return <TrialBalanceTab dateRange={dateRange} setDateRange={setDateRange} />;
            case 'profitLoss':
                return <PLStatementTab dateRange={dateRange} setDateRange={setDateRange} />;
            case 'balanceSheet':
                return <BalanceSheetTab dateRange={dateRange} setDateRange={setDateRange} />;
            default:
                return (
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                        <HiDocumentReport className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Select a ledger type to view</p>
                    </div>
                );
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Ledgers & Accounting</h1>
                        <p className="text-gray-600 mt-1">Manage and view all your accounting ledgers and reports</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportToPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 no-print"
                        >
                            <HiDownload className="w-5 h-5" />
                            Export to PDF
                        </button>
                        <button
                            onClick={handleExportToExcel}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 no-print"
                        >
                            <HiDownload className="w-5 h-5" />
                            Export to Excel
                        </button>
                    </div>
                </div>

                {/* Tabs - Horizontal Scroll */}
                <div className="border-b border-gray-200 mb-6 no-print overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex flex-col items-start">
                                    <span>{tab.name}</span>
                                    <span className="text-xs text-gray-400">{tab.description}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    {renderTabContent()}
                </div>
            </div>
        </DashboardLayout>
    );
}
