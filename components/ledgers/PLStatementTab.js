'use client';

import React, { useState } from 'react';
import { HiDocumentReport } from 'react-icons/hi';
import { invoicesAPI, purchasesAPI, expensesAPI } from '@/utils/api';
import { useToast } from '@/context/ToastContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import LedgerSummaryCards, { createCard } from './LedgerSummaryCards';

export default function PLStatementTab({ dateRange, setDateRange }) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [plData, setPlData] = useState(null);

    const generatePL = async () => {
        if (!dateRange.startDate || !dateRange.endDate) {
            toast.warning('Please select both start and end dates');
            return;
        }

        setLoading(true);
        setPlData(null);

        try {
            // Fetch all data
            const [invoicesRes, purchases, expenses] = await Promise.all([
                invoicesAPI.getAll({ startDate: dateRange.startDate, endDate: dateRange.endDate, limit: 10000 }),
                purchasesAPI.getAll({ startDate: dateRange.startDate, endDate: dateRange.endDate }),
                expensesAPI.getAll({ startDate: dateRange.startDate, endDate: dateRange.endDate })
            ]);
            // invoicesAPI returns { invoices: [], pagination: {} } — extract the array
            const invoices = Array.isArray(invoicesRes) ? invoicesRes : (invoicesRes?.invoices || []);

            // Calculate revenue
            const totalSales = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
            const salesReturns = 0; // TODO: Add sales returns when implemented
            const netSales = totalSales - salesReturns;

            // Calculate cost of goods sold
            const totalPurchases = purchases.reduce((sum, pur) => sum + pur.grandTotal, 0);
            const purchaseReturns = 0; // TODO: Add purchase returns when implemented
            const netPurchases = totalPurchases - purchaseReturns;

            // Gross profit
            const grossProfit = netSales - netPurchases;

            // Operating expenses
            const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

            // Net profit
            const netProfit = grossProfit - totalExpenses;

            setPlData({
                revenue: {
                    sales: totalSales,
                    salesReturns,
                    netSales
                },
                cogs: {
                    purchases: totalPurchases,
                    purchaseReturns,
                    netPurchases
                },
                grossProfit,
                expenses: totalExpenses,
                netProfit
            });

            toast.success('P&L Statement generated successfully!');
        } catch (error) {
            console.error('Error generating P&L:', error);
            toast.error(error.message || 'Failed to generate P&L statement');
        } finally {
            setLoading(false);
        }
    };

    // Prepare summary cards
    const summaryCards = plData ? [
        createCard('Total Revenue', plData.revenue.netSales.toLocaleString('en-IN'), 'green', '₹'),
        createCard('Total Expenses', (plData.cogs.netPurchases + plData.expenses).toLocaleString('en-IN'), 'red', '₹'),
        createCard('Net Profit', plData.netProfit.toLocaleString('en-IN'), plData.netProfit >= 0 ? 'blue' : 'orange', '₹')
    ] : [];

    return (
        <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 no-print">Profit & Loss Statement</h3>
            <p className="text-gray-600 mb-6 no-print">Summary of revenues, costs, and expenses to determine net profit or loss</p>

            {/* Date Range Filter */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6 no-print border border-gray-200">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Select Period</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <button
                        onClick={generatePL}
                        disabled={loading}
                        className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {loading ? 'Generating...' : 'Generate P&L Statement'}
                    </button>
                </div>
            </div>

            {/* Empty State */}
            {!plData && !loading && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <HiDocumentReport className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a date range and click &quot;Generate P&L Statement&quot;</p>
                    <p className="text-sm text-gray-400 mt-2">This will show profit and loss for the period</p>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <LoadingSpinner size="lg" text="Generating statement..." />
                </div>
            )}

            {/* P&L Statement */}
            {plData && (
                <div className="space-y-4">
                    <LedgerSummaryCards cards={summaryCards} />

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Particulars</th>
                                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {/* Revenue Section */}
                                <tr className="bg-green-50">
                                    <td className="px-6 py-3 text-sm font-semibold text-green-700" colSpan="2">Revenue</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-2 text-sm text-gray-900 pl-10">Sales</td>
                                    <td className="px-6 py-2 text-sm text-right text-gray-900">{plData.revenue.sales.toLocaleString('en-IN')}</td>
                                </tr>
                                {plData.revenue.salesReturns > 0 && (
                                    <tr>
                                        <td className="px-6 py-2 text-sm text-gray-900 pl-10">Less: Sales Returns</td>
                                        <td className="px-6 py-2 text-sm text-right text-red-600">({plData.revenue.salesReturns.toLocaleString('en-IN')})</td>
                                    </tr>
                                )}
                                <tr className="bg-gray-50">
                                    <td className="px-6 py-2 text-sm font-semibold text-gray-900">Net Sales</td>
                                    <td className="px-6 py-2 text-sm text-right font-semibold text-gray-900">{plData.revenue.netSales.toLocaleString('en-IN')}</td>
                                </tr>

                                {/* COGS Section */}
                                <tr className="bg-orange-50">
                                    <td className="px-6 py-3 text-sm font-semibold text-orange-700" colSpan="2">Cost of Goods Sold</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-2 text-sm text-gray-900 pl-10">Purchases</td>
                                    <td className="px-6 py-2 text-sm text-right text-gray-900">{plData.cogs.purchases.toLocaleString('en-IN')}</td>
                                </tr>
                                {plData.cogs.purchaseReturns > 0 && (
                                    <tr>
                                        <td className="px-6 py-2 text-sm text-gray-900 pl-10">Less: Purchase Returns</td>
                                        <td className="px-6 py-2 text-sm text-right text-green-600">({plData.cogs.purchaseReturns.toLocaleString('en-IN')})</td>
                                    </tr>
                                )}
                                <tr className="bg-gray-50">
                                    <td className="px-6 py-2 text-sm font-semibold text-gray-900">Net Purchases</td>
                                    <td className="px-6 py-2 text-sm text-right font-semibold text-gray-900">{plData.cogs.netPurchases.toLocaleString('en-IN')}</td>
                                </tr>

                                {/* Gross Profit */}
                                <tr className="bg-blue-50">
                                    <td className="px-6 py-3 text-sm font-bold text-blue-700">Gross Profit</td>
                                    <td className="px-6 py-3 text-sm text-right font-bold text-blue-700">{plData.grossProfit.toLocaleString('en-IN')}</td>
                                </tr>

                                {/* Operating Expenses */}
                                <tr className="bg-red-50">
                                    <td className="px-6 py-3 text-sm font-semibold text-red-700" colSpan="2">Operating Expenses</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-2 text-sm text-gray-900 pl-10">Total Expenses</td>
                                    <td className="px-6 py-2 text-sm text-right text-gray-900">{plData.expenses.toLocaleString('en-IN')}</td>
                                </tr>

                                {/* Net Profit */}
                                <tr className={`${plData.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                                    <td className={`px-6 py-4 text-base font-bold ${plData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                        {plData.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                                    </td>
                                    <td className={`px-6 py-4 text-base text-right font-bold ${plData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                        {plData.netProfit >= 0 ? '' : '('}{Math.abs(plData.netProfit).toLocaleString('en-IN')}{plData.netProfit >= 0 ? '' : ')'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
