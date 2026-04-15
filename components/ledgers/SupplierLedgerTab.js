'use client';

import React, { useState, useEffect } from 'react';
import { HiDocumentReport } from 'react-icons/hi';
import { purchasesAPI } from '@/utils/api';
import { useSuppliersStore } from '@/store/useSuppliersStore';
import { useToast } from '@/context/ToastContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import LedgerFilters from './LedgerFilters';
import LedgerSummaryCards, { createCard } from './LedgerSummaryCards';
import LedgerTable from './LedgerTable';

export default function SupplierLedgerTab({ dateRange, setDateRange }) {
    const toast = useToast();
    const { items: suppliers, fetchItems: fetchSuppliers } = useSuppliersStore();
    const [loading, setLoading] = useState(false);
    const [ledgerData, setLedgerData] = useState(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState('ALL');
    const [expandedSuppliers, setExpandedSuppliers] = useState({});

    useEffect(() => {
        fetchSuppliers().catch(err => console.error('Error loading suppliers:', err));
    }, []);

    const generateLedger = async () => {
        if (!dateRange.startDate || !dateRange.endDate) {
            toast.warning('Please select both start and end dates');
            return;
        }

        setLoading(true);
        setLedgerData(null);

        try {
            // Fetch purchases (suppliers already loaded from store)
            const [allSuppliers, purchases] = await Promise.all([
                Promise.resolve(suppliers),
                purchasesAPI.getAll({
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate
                })
            ]);

            // Group purchases by supplier
            const supplierLedgers = {};

            // Filter suppliers based on selection
            const suppliersToProcess = selectedSupplierId === 'ALL'
                ? allSuppliers
                : allSuppliers.filter(s => s._id === selectedSupplierId);

            suppliersToProcess.forEach(supplier => {
                supplierLedgers[supplier._id] = {
                    supplierId: supplier._id,
                    supplierName: supplier.name,
                    supplierPhone: supplier.phone,
                    openingBalance: 0,
                    transactions: [],
                    closingBalance: 0
                };
            });

            // Add purchase transactions
            purchases.forEach(purchase => {
                const supplierId = purchase.supplierId || purchase.supplier?._id;
                if (supplierId && supplierLedgers[supplierId]) {
                    // Add purchase as credit (we owe them)
                    supplierLedgers[supplierId].transactions.push({
                        date: purchase.purchaseDate,
                        type: 'Purchase',
                        reference: purchase.purchaseNumber || purchase.billNumber,
                        debit: 0,
                        credit: purchase.grandTotal,
                        purchaseId: purchase._id,
                        paymentStatus: purchase.paymentStatus,
                        paidAmount: purchase.paidAmount || 0,
                        balanceAmount: purchase.balanceAmount || 0
                    });

                    // Add payments as debit (we paid them)
                    if (purchase.payments && purchase.payments.length > 0) {
                        purchase.payments.forEach(payment => {
                            supplierLedgers[supplierId].transactions.push({
                                date: payment.paymentDate || payment.date,
                                type: 'Payment',
                                reference: `${purchase.purchaseNumber || purchase.billNumber} - ${payment.paymentMethod}`,
                                debit: payment.amount,
                                credit: 0,
                                paymentMethod: payment.paymentMethod,
                                referenceNumber: payment.referenceNumber
                            });
                        });
                    }
                }
            });

            // Calculate running balances and sort transactions
            Object.values(supplierLedgers).forEach(ledger => {
                ledger.transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

                let runningBalance = ledger.openingBalance;
                ledger.transactions.forEach(txn => {
                    runningBalance += txn.credit - txn.debit;
                    txn.balance = runningBalance;
                });

                ledger.closingBalance = runningBalance;
            });

            // Filter out suppliers with no transactions
            const ledgerArray = Object.values(supplierLedgers)
                .filter(ledger => ledger.transactions.length > 0)
                .sort((a, b) => a.supplierName.localeCompare(b.supplierName));

            setLedgerData(ledgerArray);
            toast.success('Supplier Ledger generated successfully!');
        } catch (error) {
            console.error('Error generating ledger:', error);
            toast.error(error.message || 'Failed to generate ledger');
        } finally {
            setLoading(false);
        }
    };

    // Prepare summary cards
    const summaryCards = ledgerData ? [
        createCard('Total Suppliers', ledgerData.length, 'blue'),
        createCard('Total Purchases', ledgerData.reduce((sum, ledger) => sum + ledger.transactions.filter(t => t.type === 'Purchase').length, 0), 'green'),
        createCard('Total Payable', ledgerData.reduce((sum, ledger) => sum + ledger.closingBalance, 0).toLocaleString('en-IN'), 'red', '₹')
    ] : [];

    return (
        <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 no-print">Supplier Ledger</h3>
            <p className="text-gray-600 mb-6 no-print">Track all supplier transactions and outstanding payables</p>

            {/* Filters */}
            <LedgerFilters
                dateRange={dateRange}
                setDateRange={setDateRange}
                selectedId={selectedSupplierId}
                setSelectedId={setSelectedSupplierId}
                items={suppliers}
                itemType="Supplier"
                onGenerate={generateLedger}
                loading={loading}
            />

            {/* Empty State */}
            {!ledgerData && !loading && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <HiDocumentReport className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a date range and click &quot;Generate Ledger&quot; to view supplier ledger</p>
                    <p className="text-sm text-gray-400 mt-2">This will show all supplier transactions, purchases, and payments</p>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <LoadingSpinner size="lg" text="Generating ledger..." />
                </div>
            )}

            {/* Ledger Data */}
            {ledgerData && ledgerData.length > 0 && (
                <div className="space-y-4">
                    <LedgerSummaryCards cards={summaryCards} />
                    <LedgerTable
                        ledgerData={ledgerData}
                        expandedItems={expandedSuppliers}
                        setExpandedItems={setExpandedSuppliers}
                        dateRange={dateRange}
                        config={{
                            entityIdKey: 'supplierId',
                            entityNameKey: 'supplierName',
                            entityPhoneKey: 'supplierPhone',
                            transactionTypeColors: {
                                Purchase: 'bg-orange-100 text-orange-700',
                                Payment: 'bg-green-100 text-green-700'
                            },
                            balancePositiveColor: 'text-red-600',
                            balanceNegativeColor: 'text-green-600'
                        }}
                    />
                </div>
            )}

            {/* No Data State */}
            {ledgerData && ledgerData.length === 0 && !loading && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <HiDocumentReport className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No supplier transactions found for the selected period</p>
                    <p className="text-sm text-gray-400 mt-2">Try selecting a different date range</p>
                </div>
            )}
        </div>
    );
}
