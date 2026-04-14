'use client';

import React, { useState } from 'react';
import { HiDocumentReport } from 'react-icons/hi';
import { invoicesAPI, purchasesAPI, expensesAPI, customersAPI, suppliersAPI } from '@/utils/api';
import { useToast } from '@/context/ToastContext';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function BalanceSheetTab({ dateRange, setDateRange }) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [balanceSheet, setBalanceSheet] = useState(null);

    const generateBalanceSheet = async () => {
        if (!dateRange.startDate || !dateRange.endDate) {
            toast.warning('Please select both start and end dates');
            return;
        }

        // Validate that start date is not later than end date
        if (new Date(dateRange.startDate) > new Date(dateRange.endDate)) {
            toast.warning('Start date cannot be later than end date');
            return;
        }

        setLoading(true);
        setBalanceSheet(null);

        try {
            // Fetch all data up to the selected date
            const [invoicesRes, purchases, expenses] = await Promise.all([
                invoicesAPI.getAll({ endDate: dateRange.endDate, limit: 10000 }),
                purchasesAPI.getAll({ endDate: dateRange.endDate }),
                expensesAPI.getAll({ endDate: dateRange.endDate })
            ]);
            // invoicesAPI returns { invoices: [], pagination: {} } — extract the array
            const invoices = Array.isArray(invoicesRes) ? invoicesRes : (invoicesRes?.invoices || []);

            // ASSETS
            // Current Assets
            let cashInHand = 0;
            let bankBalance = 0;

            // Calculate cash and bank from all transactions
            invoices.forEach(inv => {
                if (inv.payments) {
                    inv.payments.forEach(pay => {
                        if (pay.paymentMethod === 'CASH') cashInHand += pay.amount;
                        else bankBalance += pay.amount;
                    });
                }
            });

            purchases.forEach(pur => {
                if (pur.payments) {
                    pur.payments.forEach(pay => {
                        if (pay.paymentMethod === 'CASH') cashInHand -= pay.amount;
                        else bankBalance -= pay.amount;
                    });
                }
            });

            expenses.forEach(exp => {
                if (exp.paymentMethod === 'CASH') cashInHand -= exp.amount;
                else bankBalance -= exp.amount;
            });

            const accountsReceivable = invoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);
            const inventory = 0; // TODO: Calculate from inventory data

            const currentAssets = Math.max(0, cashInHand) + Math.max(0, bankBalance) + accountsReceivable + inventory;

            // Fixed Assets (placeholder)
            const fixedAssets = 0;

            const totalAssets = currentAssets + fixedAssets;

            // LIABILITIES
            // Current Liabilities
            const accountsPayable = purchases.reduce((sum, pur) => sum + (pur.balanceAmount || 0), 0);
            const currentLiabilities = accountsPayable;

            // Long-term Liabilities (placeholder)
            const longTermLiabilities = 0;

            const totalLiabilities = currentLiabilities + longTermLiabilities;

            // EQUITY
            // Calculate net profit/loss
            const totalSales = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
            const totalPurchases = purchases.reduce((sum, pur) => sum + pur.grandTotal, 0);
            const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
            const netProfit = totalSales - totalPurchases - totalExpenses;

            const capital = 0; // Placeholder - initial capital
            const retainedEarnings = netProfit;

            const totalEquity = capital + retainedEarnings;

            // Total Liabilities + Equity
            const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

            setBalanceSheet({
                assets: {
                    currentAssets: {
                        cash: Math.max(0, cashInHand),
                        bank: Math.max(0, bankBalance),
                        accountsReceivable,
                        inventory,
                        total: currentAssets
                    },
                    fixedAssets,
                    total: totalAssets
                },
                liabilities: {
                    currentLiabilities: {
                        accountsPayable,
                        total: currentLiabilities
                    },
                    longTermLiabilities,
                    total: totalLiabilities
                },
                equity: {
                    capital,
                    retainedEarnings,
                    total: totalEquity
                },
                totalLiabilitiesAndEquity,
                balanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1
            });

            toast.success('Balance Sheet generated successfully!');
        } catch (error) {
            console.error('Error generating balance sheet:', error);
            toast.error(error.message || 'Failed to generate balance sheet');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 no-print">Balance Sheet</h3>
            <p className="text-gray-600 mb-6 no-print">Snapshot of assets, liabilities, and equity at a specific date</p>

            {/* Date Filter */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6 no-print border border-gray-200">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Select Period</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-black">
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date (As on Date)</label>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            min={dateRange.startDate}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={generateBalanceSheet}
                            disabled={loading}
                            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {loading ? 'Generating...' : 'Generate Balance Sheet'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Empty State */}
            {!balanceSheet && !loading && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <HiDocumentReport className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a date range and click &quot;Generate Balance Sheet&quot;</p>
                    <p className="text-sm text-gray-400 mt-2">This will show financial position for the selected period</p>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <LoadingSpinner size="lg" text="Generating balance sheet..." />
                </div>
            )}

            {/* Balance Sheet */}
            {balanceSheet && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Assets Side */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-blue-100 px-6 py-3">
                            <h4 className="text-lg font-bold text-blue-700">ASSETS</h4>
                        </div>
                        <table className="w-full">
                            <tbody className="divide-y divide-gray-200">
                                <tr className="bg-gray-50">
                                    <td className="px-6 py-2 text-sm font-semibold text-gray-700" colSpan="2">Current Assets</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-2 text-sm text-gray-900 pl-10">Cash in Hand</td>
                                    <td className="px-6 py-2 text-sm text-right text-gray-900">{balanceSheet.assets.currentAssets.cash.toLocaleString('en-IN')}</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-2 text-sm text-gray-900 pl-10">Bank Balance</td>
                                    <td className="px-6 py-2 text-sm text-right text-gray-900">{balanceSheet.assets.currentAssets.bank.toLocaleString('en-IN')}</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-2 text-sm text-gray-900 pl-10">Accounts Receivable</td>
                                    <td className="px-6 py-2 text-sm text-right text-gray-900">{balanceSheet.assets.currentAssets.accountsReceivable.toLocaleString('en-IN')}</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-2 text-sm text-gray-900 pl-10">Inventory</td>
                                    <td className="px-6 py-2 text-sm text-right text-gray-900">{balanceSheet.assets.currentAssets.inventory.toLocaleString('en-IN')}</td>
                                </tr>
                                <tr className="bg-gray-100">
                                    <td className="px-6 py-2 text-sm font-semibold text-gray-900">Total Current Assets</td>
                                    <td className="px-6 py-2 text-sm text-right font-semibold text-gray-900">{balanceSheet.assets.currentAssets.total.toLocaleString('en-IN')}</td>
                                </tr>
                                <tr className="bg-gray-50">
                                    <td className="px-6 py-2 text-sm font-semibold text-gray-700">Fixed Assets</td>
                                    <td className="px-6 py-2 text-sm text-right text-gray-900">{balanceSheet.assets.fixedAssets.toLocaleString('en-IN')}</td>
                                </tr>
                                <tr className="bg-blue-50">
                                    <td className="px-6 py-3 text-base font-bold text-blue-700">TOTAL ASSETS</td>
                                    <td className="px-6 py-3 text-base text-right font-bold text-blue-700">{balanceSheet.assets.total.toLocaleString('en-IN')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Liabilities & Equity Side */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-green-100 px-6 py-3">
                            <h4 className="text-lg font-bold text-green-700">LIABILITIES & EQUITY</h4>
                        </div>
                        <table className="w-full">
                            <tbody className="divide-y divide-gray-200">
                                <tr className="bg-gray-50">
                                    <td className="px-6 py-2 text-sm font-semibold text-gray-700" colSpan="2">Current Liabilities</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-2 text-sm text-gray-900 pl-10">Accounts Payable</td>
                                    <td className="px-6 py-2 text-sm text-right text-gray-900">{balanceSheet.liabilities.currentLiabilities.accountsPayable.toLocaleString('en-IN')}</td>
                                </tr>
                                <tr className="bg-gray-100">
                                    <td className="px-6 py-2 text-sm font-semibold text-gray-900">Total Current Liabilities</td>
                                    <td className="px-6 py-2 text-sm text-right font-semibold text-gray-900">{balanceSheet.liabilities.currentLiabilities.total.toLocaleString('en-IN')}</td>
                                </tr>
                                <tr className="bg-gray-50">
                                    <td className="px-6 py-2 text-sm font-semibold text-gray-700">Long-term Liabilities</td>
                                    <td className="px-6 py-2 text-sm text-right text-gray-900">{balanceSheet.liabilities.longTermLiabilities.toLocaleString('en-IN')}</td>
                                </tr>
                                <tr className="bg-orange-50">
                                    <td className="px-6 py-2 text-sm font-bold text-orange-700">Total Liabilities</td>
                                    <td className="px-6 py-2 text-sm text-right font-bold text-orange-700">{balanceSheet.liabilities.total.toLocaleString('en-IN')}</td>
                                </tr>
                                <tr className="bg-gray-50">
                                    <td className="px-6 py-2 text-sm font-semibold text-gray-700" colSpan="2">Equity</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-2 text-sm text-gray-900 pl-10">Capital</td>
                                    <td className="px-6 py-2 text-sm text-right text-gray-900">{balanceSheet.equity.capital.toLocaleString('en-IN')}</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-2 text-sm text-gray-900 pl-10">Retained Earnings</td>
                                    <td className="px-6 py-2 text-sm text-right text-gray-900">{balanceSheet.equity.retainedEarnings.toLocaleString('en-IN')}</td>
                                </tr>
                                <tr className="bg-gray-100">
                                    <td className="px-6 py-2 text-sm font-semibold text-gray-900">Total Equity</td>
                                    <td className="px-6 py-2 text-sm text-right font-semibold text-gray-900">{balanceSheet.equity.total.toLocaleString('en-IN')}</td>
                                </tr>
                                <tr className="bg-green-50">
                                    <td className="px-6 py-3 text-base font-bold text-green-700">TOTAL LIABILITIES & EQUITY</td>
                                    <td className="px-6 py-3 text-base text-right font-bold text-green-700">{balanceSheet.totalLiabilitiesAndEquity.toLocaleString('en-IN')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Balance Check */}
                    <div className="md:col-span-2">
                        {balanceSheet.balanced ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                <p className="text-green-700 font-semibold">✓ Balance Sheet is Balanced</p>
                                <p className="text-sm text-green-600 mt-1">Assets = Liabilities + Equity</p>
                            </div>
                        ) : (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                                <p className="text-red-700 font-semibold">⚠️ Balance Sheet is Not Balanced</p>
                                <p className="text-sm text-red-600 mt-1">
                                    Difference: ₹{Math.abs(balanceSheet.assets.total - balanceSheet.totalLiabilitiesAndEquity).toLocaleString('en-IN')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
