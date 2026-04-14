'use client';

import React, { useState } from 'react';
import { HiDocumentReport } from 'react-icons/hi';
import { invoicesAPI, purchasesAPI, expensesAPI } from '@/utils/api';
import { useToast } from '@/context/ToastContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import LedgerSummaryCards, { createCard } from './LedgerSummaryCards';

export default function BankLedgerTab({ dateRange, setDateRange }) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [ledgerData, setLedgerData] = useState(null);

    const generateLedger = async () => {
        if (!dateRange.startDate || !dateRange.endDate) {
            toast.warning('Please select both start and end dates');
            return;
        }

        setLoading(true);
        setLedgerData(null);

        try {
            // Fetch all bank transactions
            const [invoicesRes, purchases, expenses] = await Promise.all([
                invoicesAPI.getAll({
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate,
                    limit: 10000,
                }),
                purchasesAPI.getAll({
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate
                }),
                expensesAPI.getAll({
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate
                })
            ]);
            // invoicesAPI returns { invoices: [], pagination: {} } — extract the array
            const invoices = Array.isArray(invoicesRes) ? invoicesRes : (invoicesRes?.invoices || []);

            const transactions = [];
            let openingBalance = 0; // Could be fetched from previous period

            // Add bank receipts (invoice payments via bank/UPI/card)
            invoices.forEach(invoice => {
                if (invoice.payments && invoice.payments.length > 0) {
                    invoice.payments.forEach(payment => {
                        if (['BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE'].includes(payment.paymentMethod)) {
                            transactions.push({
                                date: payment.paymentDate || payment.date,
                                type: 'Bank Receipt',
                                reference: `${invoice.invoiceNumber} - ${invoice.customerName || 'Customer'} (${payment.paymentMethod})`,
                                debit: payment.amount,
                                credit: 0,
                                balance: 0,
                                paymentMethod: payment.paymentMethod
                            });
                        }
                    });
                }
            });

            // Add bank payments (purchase payments via bank/UPI/card)
            purchases.forEach(purchase => {
                if (purchase.payments && purchase.payments.length > 0) {
                    purchase.payments.forEach(payment => {
                        if (['BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE'].includes(payment.paymentMethod)) {
                            transactions.push({
                                date: payment.paymentDate || payment.date,
                                type: 'Bank Payment',
                                reference: `${purchase.purchaseNumber || purchase.billNumber} - ${purchase.supplierName || 'Supplier'} (${payment.paymentMethod})`,
                                debit: 0,
                                credit: payment.amount,
                                balance: 0,
                                paymentMethod: payment.paymentMethod
                            });
                        }
                    });
                }
            });

            // Add bank expenses
            expenses.forEach(expense => {
                if (['BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE'].includes(expense.paymentMethod)) {
                    transactions.push({
                        date: expense.expenseDate,
                        type: 'Bank Expense',
                        reference: `${expense.category} - ${expense.description || ''} (${expense.paymentMethod})`,
                        debit: 0,
                        credit: expense.amount,
                        balance: 0,
                        paymentMethod: expense.paymentMethod
                    });
                }
            });

            // Sort transactions by date
            transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Calculate running balance
            let runningBalance = openingBalance;
            transactions.forEach(txn => {
                runningBalance += txn.debit - txn.credit;
                txn.balance = runningBalance;
            });

            const closingBalance = runningBalance;

            setLedgerData({
                openingBalance,
                transactions,
                closingBalance,
                totalBankIn: transactions.reduce((sum, t) => sum + t.debit, 0),
                totalBankOut: transactions.reduce((sum, t) => sum + t.credit, 0)
            });

            toast.success('Bank Ledger generated successfully!');
        } catch (error) {
            console.error('Error generating bank ledger:', error);
            toast.error(error.message || 'Failed to generate bank ledger');
        } finally {
            setLoading(false);
        }
    };

    // Prepare summary cards
    const summaryCards = ledgerData ? [
        createCard('Total Bank In', ledgerData.totalBankIn.toLocaleString('en-IN'), 'green', '₹'),
        createCard('Total Bank Out', ledgerData.totalBankOut.toLocaleString('en-IN'), 'red', '₹'),
        createCard('Closing Balance', ledgerData.closingBalance.toLocaleString('en-IN'), ledgerData.closingBalance >= 0 ? 'blue' : 'orange', '₹')
    ] : [];

    return (
        <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 no-print">Bank Ledger</h3>
            <p className="text-gray-600 mb-6 no-print">Track all bank transactions - receipts, payments, and transfers</p>

            {/* Date Range Filter - No Dropdown */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6 no-print border border-gray-200">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Select Period</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Date
                        </label>
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
                        onClick={generateLedger}
                        disabled={loading}
                        className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {loading ? 'Generating...' : 'Generate Ledger'}
                    </button>
                </div>
            </div>

            {/* Empty State */}
            {!ledgerData && !loading && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <HiDocumentReport className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a date range and click &quot;Generate Ledger&quot; to view bank book</p>
                    <p className="text-sm text-gray-400 mt-2">This will show all bank receipts and payments</p>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <LoadingSpinner size="lg" text="Generating ledger..." />
                </div>
            )}

            {/* Ledger Data */}
            {ledgerData && ledgerData.transactions.length > 0 && (
                <div className="space-y-4">
                    <LedgerSummaryCards cards={summaryCards} />

                    {/* Bank Book Table */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Reference</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Bank In (₹)</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Bank Out (₹)</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Balance (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {/* Opening Balance */}
                                {ledgerData.openingBalance !== 0 && (
                                    <tr className="bg-blue-50">
                                        <td className="px-4 py-2 text-sm text-gray-600">
                                            {new Date(dateRange.startDate).toLocaleDateString('en-IN')}
                                        </td>
                                        <td className="px-4 py-2 text-sm font-medium text-blue-700" colSpan="2">
                                            Opening Balance
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right">-</td>
                                        <td className="px-4 py-2 text-sm text-right">-</td>
                                        <td className="px-4 py-2 text-sm text-right font-semibold text-blue-700">
                                            {ledgerData.openingBalance.toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                )}

                                {/* Transactions */}
                                {ledgerData.transactions.map((txn, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm text-gray-900">
                                            {new Date(txn.date).toLocaleDateString('en-IN')}
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${txn.type === 'Bank Receipt'
                                                ? 'bg-green-100 text-green-700'
                                                : txn.type === 'Bank Payment'
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : 'bg-red-100 text-red-700'
                                                }`}>
                                                {txn.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900">{txn.reference}</td>
                                        <td className="px-4 py-2 text-sm text-right font-medium text-green-600">
                                            {txn.debit > 0 ? txn.debit.toLocaleString('en-IN') : '-'}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right font-medium text-red-600">
                                            {txn.credit > 0 ? txn.credit.toLocaleString('en-IN') : '-'}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900">
                                            {txn.balance.toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                ))}

                                {/* Closing Balance */}
                                <tr className="bg-gray-100 font-semibold">
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {new Date(dateRange.endDate).toLocaleDateString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900" colSpan="2">
                                        Closing Balance
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right text-green-600">
                                        {ledgerData.totalBankIn.toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right text-red-600">
                                        {ledgerData.totalBankOut.toLocaleString('en-IN')}
                                    </td>
                                    <td className={`px-4 py-3 text-sm text-right font-bold ${ledgerData.closingBalance >= 0 ? 'text-blue-600' : 'text-orange-600'
                                        }`}>
                                        {ledgerData.closingBalance.toLocaleString('en-IN')}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* No Data State */}
            {ledgerData && ledgerData.transactions.length === 0 && !loading && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <HiDocumentReport className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No bank transactions found for the selected period</p>
                    <p className="text-sm text-gray-400 mt-2">Try selecting a different date range</p>
                </div>
            )}
        </div>
    );
}
