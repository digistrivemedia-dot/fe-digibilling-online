'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import PageLoader from '@/components/PageLoader';
import { expensesAPI } from '@/utils/api';
import { useShopStore } from '@/store/useShopStore';

export default function ExpenseDetail() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const params = useParams();
  const { shopSettings, fetchShopSettings } = useShopStore();
  const [expense, setExpense] = useState(null);
  const [loadingExpense, setLoadingExpense] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user && params.id) {
      loadExpense();
      fetchShopSettings();
    }
  }, [user, loading, router, params.id]);

  const loadExpense = async () => {
    try {
      const data = await expensesAPI.getOne(params.id);
      setExpense(data);
    } catch (error) {
      console.error('Error loading expense:', error);
      toast.error('Expense not found');
      router.push('/dashboard/expenses');
    } finally {
      setLoadingExpense(false);
    }
  };

  const handleDownload = () => {
    const hasSeenTip = localStorage.getItem('pdfPrintTipSeen');
    if (!hasSeenTip) {
      toast.info('Tip: Turn OFF "Headers and footers" in print dialog for clean PDF', 6000);
      localStorage.setItem('pdfPrintTipSeen', 'true');
    }
    window.print();
  };

  if (loading || !user || loadingExpense) {
    return <PageLoader text="Loading expense details..." />;
  }

  if (!expense) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Action Buttons */}
        <div className="flex justify-between items-center no-print">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Back
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
              title="Save as PDF using your browser's print dialog"
            >
              📥 Save as PDF
            </button>
          </div>
        </div>

        {/* Expense Document */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 invoice-print">
          {/* Header */}
          <div className="border-b-2 border-gray-800 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {shopSettings?.shopName || 'Medical Store'}
                </h1>
                {shopSettings && (
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <p>{shopSettings.address}</p>
                    <p>
                      {shopSettings.city}, {shopSettings.state} - {shopSettings.pincode}
                    </p>
                    <p>Phone: {shopSettings.phone}</p>
                    {shopSettings.email && <p>Email: {shopSettings.email}</p>}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="inline-block px-4 py-2 bg-orange-600 text-white rounded-lg">
                  <p className="text-sm font-medium">EXPENSE VOUCHER</p>
                </div>
                <p className="mt-4 text-2xl font-bold text-gray-900">
                  {expense.expenseNumber}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Date: {new Date(expense.date).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          {/* Expense Details */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Expense Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium text-gray-900">{expense.category.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Description:</span>
                    <span className="font-medium text-gray-900">{expense.description}</span>
                  </div>
                  {expense.vendor && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vendor:</span>
                      <span className="font-medium text-gray-900">{expense.vendor}</span>
                    </div>
                  )}
                  {expense.billNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bill Number:</span>
                      <span className="font-medium text-gray-900">{expense.billNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Payment Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium text-gray-900">{expense.paymentMethod}</span>
                  </div>
                  {expense.paidTo && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paid To:</span>
                      <span className="font-medium text-gray-900">{expense.paidTo}</span>
                    </div>
                  )}
                  {expense.transactionReference && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reference:</span>
                      <span className="font-medium text-gray-900">{expense.transactionReference}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Amount Breakdown */}
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">Amount Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-base">
                  <span className="text-gray-700">Base Amount:</span>
                  <span className="font-medium text-gray-900">₹{expense.amount.toFixed(2)}</span>
                </div>

                {expense.gstAmount > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">GST ({expense.gstRate}%):</span>
                      <span className="font-medium text-gray-900">₹{expense.gstAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-300 pt-3 mt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span className="text-gray-900">Total Amount:</span>
                        <span className="text-orange-600">₹{expense.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}

                {expense.gstAmount === 0 && (
                  <div className="border-t border-gray-300 pt-3 mt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-gray-900">Total Amount:</span>
                      <span className="text-orange-600">₹{expense.amount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {expense.notes && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes:</h3>
              <p className="text-sm text-gray-900">{expense.notes}</p>
            </div>
          )}

          {/* Attachments */}
          {expense.attachments && expense.attachments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Attachments:</h3>
              <div className="flex flex-wrap gap-2">
                {expense.attachments.map((attachment, index) => (
                  <a
                    key={index}
                    href={attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Attachment {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-300">
            <div className="text-xs text-gray-500 text-center">
              <p>This is a computer generated expense voucher.</p>
              <p className="mt-1">Generated on {new Date(expense.createdAt).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          * {
            visibility: hidden;
          }

          .invoice-print,
          .invoice-print * {
            visibility: visible;
          }

          html, body {
            width: 210mm;
            height: auto;
            margin: 0;
            padding: 0;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            background: white;
          }

          .no-print {
            display: none !important;
          }

          .invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 15mm;
            margin: 0;
            width: 210mm;
            max-width: 210mm;
            background: white;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-footer-group;
          }

          .border-b-2,
          .space-y-2,
          .pt-3 {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
