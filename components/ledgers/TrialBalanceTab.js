'use client';

import React, { useState } from 'react';
import { HiDocumentReport } from 'react-icons/hi';
import { invoicesAPI, purchasesAPI, expensesAPI } from '@/utils/api';
import { useToast } from '@/context/ToastContext';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function TrialBalanceTab({ dateRange, setDateRange }) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [trialBalance, setTrialBalance] = useState(null);

    const generateTrialBalance = async () => {
        if (!dateRange.startDate || !dateRange.endDate) {
            toast.warning('Please select both start and end dates');
            return;
        }

        setLoading(true);
        setTrialBalance(null);

        try {
            // Fetch all data
            const [invoicesRes, purchases, expenses] = await Promise.all([
                invoicesAPI.getAll({ startDate: dateRange.startDate, endDate: dateRange.endDate, limit: 10000 }),
                purchasesAPI.getAll({ startDate: dateRange.startDate, endDate: dateRange.endDate }),
                expensesAPI.getAll({ startDate: dateRange.startDate, endDate: dateRange.endDate }),
            ]);
            // invoicesAPI returns { invoices: [], pagination: {} } — extract the array
            const invoices = Array.isArray(invoicesRes) ? invoicesRes : (invoicesRes?.invoices || []);

            const accounts = [];

            // Calculate total sales
            const totalSales = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
            if (totalSales > 0) {
                accounts.push({ name: 'Sales', debit: 0, credit: totalSales });
            }

            // Calculate total purchases
            const totalPurchases = purchases.reduce((sum, pur) => sum + pur.grandTotal, 0);
            if (totalPurchases > 0) {
                accounts.push({ name: 'Purchases', debit: totalPurchases, credit: 0 });
            }

            // Calculate total expenses
            const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
            if (totalExpenses > 0) {
                accounts.push({ name: 'Expenses', debit: totalExpenses, credit: 0 });
            }

            // Calculate accounts receivable (customer outstanding)
            const accountsReceivable = invoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);
            if (accountsReceivable > 0) {
                accounts.push({ name: 'Accounts Receivable (Debtors)', debit: accountsReceivable, credit: 0 });
            }

            // Calculate accounts payable (supplier outstanding)
            const accountsPayable = purchases.reduce((sum, pur) => sum + (pur.balanceAmount || 0), 0);
            if (accountsPayable > 0) {
                accounts.push({ name: 'Accounts Payable (Creditors)', debit: 0, credit: accountsPayable });
            }

            // Calculate cash and bank balances (simplified)
            let cashBalance = 0;
            let bankBalance = 0;

            // Cash receipts from invoices
            invoices.forEach(inv => {
                if (inv.payments) {
                    inv.payments.forEach(pay => {
                        if (pay.paymentMethod === 'CASH') cashBalance += pay.amount;
                        else bankBalance += pay.amount;
                    });
                }
            });

            // Cash payments for purchases
            purchases.forEach(pur => {
                if (pur.payments) {
                    pur.payments.forEach(pay => {
                        if (pay.paymentMethod === 'CASH') cashBalance -= pay.amount;
                        else bankBalance -= pay.amount;
                    });
                }
            });

            // Expense payments
            expenses.forEach(exp => {
                if (exp.paymentMethod === 'CASH') cashBalance -= exp.amount;
                else bankBalance -= exp.amount;
            });

            if (cashBalance !== 0) {
                accounts.push({
                    name: 'Cash in Hand',
                    debit: cashBalance > 0 ? cashBalance : 0,
                    credit: cashBalance < 0 ? Math.abs(cashBalance) : 0
                });
            }

            if (bankBalance !== 0) {
                accounts.push({
                    name: 'Bank Account',
                    debit: bankBalance > 0 ? bankBalance : 0,
                    credit: bankBalance < 0 ? Math.abs(bankBalance) : 0
                });
            }

            // Calculate totals
            const totalDebit = accounts.reduce((sum, acc) => sum + acc.debit, 0);
            const totalCredit = accounts.reduce((sum, acc) => sum + acc.credit, 0);

            setTrialBalance({
                accounts,
                totalDebit,
                totalCredit,
                difference: Math.abs(totalDebit - totalCredit)
            });

            toast.success('Trial Balance generated successfully!');
        } catch (error) {
            console.error('Error generating trial balance:', error);
            toast.error(error.message || 'Failed to generate trial balance');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 no-print">Trial Balance</h3>
            <p className="text-gray-600 mb-6 no-print">Summary of all account balances to verify debit and credit equality</p>

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
                        onClick={generateTrialBalance}
                        disabled={loading}
                        className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {loading ? 'Generating...' : 'Generate Trial Balance'}
                    </button>
                </div>
            </div>

            {/* Empty State */}
            {!trialBalance && !loading && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <HiDocumentReport className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a date range and click &quot;Generate Trial Balance&quot;</p>
                    <p className="text-sm text-gray-400 mt-2">This will show all account balances</p>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <LoadingSpinner size="lg" text="Generating trial balance..." />
                </div>
            )}

            {/* Trial Balance Table */}
            {trialBalance && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Account Name</th>
                                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Debit (₹)</th>
                                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Credit (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {trialBalance.accounts.map((account, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 text-sm text-gray-900">{account.name}</td>
                                    <td className="px-6 py-3 text-sm text-right font-medium text-gray-900">
                                        {account.debit > 0 ? account.debit.toLocaleString('en-IN') : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-right font-medium text-gray-900">
                                        {account.credit > 0 ? account.credit.toLocaleString('en-IN') : '-'}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-gray-100 font-bold">
                                <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                                <td className="px-6 py-4 text-sm text-right text-blue-600">
                                    {trialBalance.totalDebit.toLocaleString('en-IN')}
                                </td>
                                <td className="px-6 py-4 text-sm text-right text-green-600">
                                    {trialBalance.totalCredit.toLocaleString('en-IN')}
                                </td>
                            </tr>
                            {trialBalance.difference > 0 && (
                                <tr className="bg-red-50">
                                    <td className="px-6 py-3 text-sm font-semibold text-red-700" colSpan="3">
                                        ⚠️ Difference: ₹{trialBalance.difference.toLocaleString('en-IN')} (Trial Balance does not match)
                                    </td>
                                </tr>
                            )}
                            {trialBalance.difference === 0 && (
                                <tr className="bg-green-50">
                                    <td className="px-6 py-3 text-sm font-semibold text-green-700" colSpan="3">
                                        ✓ Trial Balance Matched (Debit = Credit)
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
