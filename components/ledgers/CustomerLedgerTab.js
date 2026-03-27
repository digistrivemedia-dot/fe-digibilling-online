'use client';

import React, { useState, useEffect } from 'react';
import { HiDocumentReport } from 'react-icons/hi';
import { customersAPI, invoicesAPI } from '@/utils/api';
import { useToast } from '@/context/ToastContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import LedgerFilters from './LedgerFilters';
import LedgerSummaryCards, { createCard } from './LedgerSummaryCards';
import LedgerTable from './LedgerTable';

export default function CustomerLedgerTab({ dateRange, setDateRange }) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [ledgerData, setLedgerData] = useState(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState('ALL');
    const [customers, setCustomers] = useState([]);
    const [expandedCustomers, setExpandedCustomers] = useState({});

    // Load customers for dropdown
    useEffect(() => {
        const loadCustomers = async () => {
            try {
                const customersList = await customersAPI.getAll();
                setCustomers(customersList);
            } catch (error) {
                console.error('Error loading customers:', error);
            }
        };
        loadCustomers();
    }, []);

    const generateLedger = async () => {
        if (!dateRange.startDate || !dateRange.endDate) {
            toast.warning('Please select both start and end dates');
            return;
        }

        setLoading(true);
        setLedgerData(null);

        try {
            // Fetch customers and invoices
            const [allCustomers, invoiceResponse] = await Promise.all([
                customersAPI.getAll(),
                invoicesAPI.getAll({
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate
                })
            ]);

            // Extract invoices array from response (API returns { invoices: [...], pagination: {...} })
            const invoices = Array.isArray(invoiceResponse) ? invoiceResponse : (invoiceResponse.invoices || []);

            // Group invoices by customer
            const customerLedgers = {};

            // Filter customers based on selection
            const customersToProcess = selectedCustomerId === 'ALL'
                ? allCustomers
                : allCustomers.filter(c => c._id === selectedCustomerId);

            customersToProcess.forEach(customer => {
                customerLedgers[customer._id] = {
                    customerId: customer._id,
                    customerName: customer.name,
                    customerPhone: customer.phone,
                    openingBalance: 0,
                    transactions: [],
                    closingBalance: 0
                };
            });

            // Add invoice transactions
            invoices.forEach(invoice => {
                const customerId = invoice.customerId || invoice.customer?._id;
                if (customerId && customerLedgers[customerId]) {
                    // Add invoice as debit
                    customerLedgers[customerId].transactions.push({
                        date: invoice.invoiceDate,
                        type: 'Invoice',
                        reference: invoice.invoiceNumber,
                        debit: invoice.grandTotal,
                        credit: 0,
                        invoiceId: invoice._id,
                        paymentStatus: invoice.paymentStatus,
                        paidAmount: invoice.paidAmount || 0,
                        balanceAmount: invoice.balanceAmount || 0
                    });

                    // Add payments as credit
                    if (invoice.payments && invoice.payments.length > 0) {
                        invoice.payments.forEach(payment => {
                            customerLedgers[customerId].transactions.push({
                                date: payment.paymentDate || payment.date,
                                type: 'Payment',
                                reference: `${invoice.invoiceNumber} - ${payment.paymentMethod}`,
                                debit: 0,
                                credit: payment.amount,
                                paymentMethod: payment.paymentMethod,
                                referenceNumber: payment.referenceNumber
                            });
                        });
                    }
                }
            });

            // Calculate running balances and sort transactions
            Object.values(customerLedgers).forEach(ledger => {
                ledger.transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

                let runningBalance = ledger.openingBalance;
                ledger.transactions.forEach(txn => {
                    runningBalance += txn.debit - txn.credit;
                    txn.balance = runningBalance;
                });

                ledger.closingBalance = runningBalance;
            });

            // Filter out customers with no transactions
            const ledgerArray = Object.values(customerLedgers)
                .filter(ledger => ledger.transactions.length > 0)
                .sort((a, b) => a.customerName.localeCompare(b.customerName));

            setLedgerData(ledgerArray);
            toast.success('Customer Ledger generated successfully!');
        } catch (error) {
            console.error('Error generating ledger:', error);
            toast.error(error.message || 'Failed to generate ledger');
        } finally {
            setLoading(false);
        }
    };

    // Prepare summary cards
    const summaryCards = ledgerData ? [
        createCard('Total Customers', ledgerData.length, 'blue'),
        createCard('Total Invoices', ledgerData.reduce((sum, ledger) => sum + ledger.transactions.filter(t => t.type === 'Invoice').length, 0), 'green'),
        createCard('Total Outstanding', ledgerData.reduce((sum, ledger) => sum + ledger.closingBalance, 0).toLocaleString('en-IN'), 'red', '₹')
    ] : [];

    return (
        <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 no-print">Customer Ledger</h3>
            <p className="text-gray-600 mb-6 no-print">Track all customer transactions and outstanding receivables</p>

            {/* Filters */}
            <LedgerFilters
                dateRange={dateRange}
                setDateRange={setDateRange}
                selectedId={selectedCustomerId}
                setSelectedId={setSelectedCustomerId}
                items={customers}
                itemType="Customer"
                onGenerate={generateLedger}
                loading={loading}
            />

            {/* Empty State */}
            {!ledgerData && !loading && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <HiDocumentReport className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a date range and click &quot;Generate Ledger&quot; to view customer ledger</p>
                    <p className="text-sm text-gray-400 mt-2">This will show all customer transactions, invoices, and payments</p>
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
                        expandedItems={expandedCustomers}
                        setExpandedItems={setExpandedCustomers}
                        dateRange={dateRange}
                        config={{
                            entityIdKey: 'customerId',
                            entityNameKey: 'customerName',
                            entityPhoneKey: 'customerPhone',
                            transactionTypeColors: {
                                Invoice: 'bg-blue-100 text-blue-700',
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
                    <p className="text-gray-500">No customer transactions found for the selected period</p>
                    <p className="text-sm text-gray-400 mt-2">Try selecting a different date range</p>
                </div>
            )}
        </div>
    );
}
