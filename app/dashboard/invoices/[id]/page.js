'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import PageLoader from '@/components/PageLoader';
import { invoicesAPI, shopAPI } from '@/utils/api';
import { HiPlus, HiPencil, HiTrash, HiX, HiCurrencyRupee, HiEye } from 'react-icons/hi';
import ModernTemplate from '@/components/invoice-templates/ModernTemplate';
import TallyPortraitTemplate from '@/components/invoice-templates/TallyPortraitTemplate';
import TallyLandscapeTemplate from '@/components/invoice-templates/TallyLandscapeTemplate';

export default function InvoiceDetail() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const params = useParams();
  const [invoice, setInvoice] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user && params.id) {
      loadInvoice();
      loadShopSettings();
    }
  }, [user, loading, router, params.id]);

  const loadInvoice = async () => {
    try {
      const data = await invoicesAPI.getOne(params.id);
      setInvoice(data);
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Invoice not found');
      router.push('/dashboard/invoices');
    } finally {
      setLoadingInvoice(false);
    }
  };

  const loadShopSettings = async () => {
    try {
      const data = await shopAPI.get();
      setShopSettings(data);
    } catch (error) {
      console.error('Error loading shop settings:', error);
    } finally {
      setLoadingSettings(false);
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

  const handleWhatsAppShare = () => {
    const shopName = shopSettings?.shopName || 'Our Store';

    // Generate PDF link
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const pdfLink = `${apiBaseUrl}/api/invoices/${invoice._id}/pdf`;
    const message = `Hi ${invoice.customerName}!

Here is your invoice from *${shopName}*

*INVOICE DETAILS*
━━━━━━━━━━━━━━━━━━━━
Invoice Number: *${invoice.invoiceNumber}*
Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
${invoice.balanceAmount > 0
        ? `
Amount: *Rs. ${invoice.grandTotal.toLocaleString('en-IN')}*
Paid: Rs. ${invoice.paidAmount.toLocaleString('en-IN')}
*Balance Due: Rs. ${invoice.balanceAmount.toLocaleString('en-IN')}*`
        : `
Total Amount: *Rs. ${invoice.grandTotal.toLocaleString('en-IN')}*
Status: *FULLY PAID*`}
━━━━━━━━━━━━━━━━━━━━

*VIEW OR DOWNLOAD INVOICE:*
${pdfLink}

Thank you for your business!

_This is a computer generated invoice_`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Open modal to add new payment
  const openAddPaymentModal = () => {
    setEditingPaymentId(null);
    setPaymentAmount(invoice?.balanceAmount || 0);
    setPaymentMethod('CASH');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReferenceNumber('');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  // Open modal to edit existing payment
  const openEditPaymentModal = (payment) => {
    setEditingPaymentId(payment._id);
    setPaymentAmount(payment.amount);
    setPaymentMethod(payment.paymentMethod);
    setPaymentDate(new Date(payment.paymentDate).toISOString().split('T')[0]);
    setReferenceNumber(payment.referenceNumber || '');
    setPaymentNotes(payment.notes || '');
    setShowPaymentModal(true);
  };

  // Handle add/edit payment submission
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    try {
      const paymentData = {
        amount: paymentAmount,
        paymentMethod,
        paymentDate,
        referenceNumber,
        notes: paymentNotes,
      };

      if (editingPaymentId) {
        await invoicesAPI.editPayment(params.id, editingPaymentId, paymentData);
        toast.success('Payment updated successfully!');
      } else {
        await invoicesAPI.addPayment(params.id, paymentData);
        toast.success('Payment recorded successfully!');
      }

      setShowPaymentModal(false);
      loadInvoice();
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    }
  };

  // Open delete confirmation modal
  const openDeleteModal = (paymentId) => {
    setDeletingPaymentId(paymentId);
    setShowDeleteModal(true);
  };

  // Handle delete payment
  const handleDeletePayment = async () => {
    try {
      await invoicesAPI.deletePayment(params.id, deletingPaymentId);
      toast.success('Payment deleted successfully!');
      setShowDeleteModal(false);
      setDeletingPaymentId(null);
      loadInvoice();
    } catch (error) {
      toast.error(error.message || 'Failed to delete payment');
    }
  };

  if (loading || !user || loadingInvoice || loadingSettings) {
    return <PageLoader text="Loading invoice details..." />;
  }

  if (!invoice) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 no-print">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm flex items-center justify-center gap-2"
              title="Share invoice details on WhatsApp"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Share on WhatsApp
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
              title="Save as PDF using your browser's print dialog"
            >
              📥 Save as PDF
            </button>
          </div>
        </div>

        {/* Payment Status Banner - Clean & Subtle */}
        <div className={`rounded-xl shadow-sm border-2 p-6 no-print transition-all ${invoice.paymentStatus === 'PAID'
          ? 'bg-green-50 border-green-200'
          : invoice.paymentStatus === 'PARTIAL'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-rose-50 border-rose-200'
          }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className={`text-xl font-semibold ${invoice.paymentStatus === 'PAID'
                  ? 'text-green-800'
                  : invoice.paymentStatus === 'PARTIAL'
                    ? 'text-amber-800'
                    : 'text-rose-800'
                  }`}>
                  {invoice.paymentStatus === 'PAID' ? '✓ Fully Paid' :
                    invoice.paymentStatus === 'PARTIAL' ? '⚠ Partially Paid' :
                      '○ Unpaid'}
                </h3>
              </div>
              <div className="flex gap-6 mt-2 text-sm text-gray-700">
                <div>Total: <span className="font-semibold">₹{invoice.grandTotal.toLocaleString('en-IN')}</span></div>
                <div>Paid: <span className="font-semibold text-green-700">₹{invoice.paidAmount.toLocaleString('en-IN')}</span></div>
                {invoice.balanceAmount > 0 && (
                  <div>Balance: <span className="font-semibold text-rose-700">₹{invoice.balanceAmount.toLocaleString('en-IN')}</span></div>
                )}
              </div>
            </div>
            {invoice.balanceAmount > 0 && (
              <button
                onClick={openAddPaymentModal}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm"
              >
                <HiCurrencyRupee className="w-5 h-5" />
                Record Payment
              </button>
            )}
          </div>
        </div>

        {/* Payment History - Clean & Professional */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden no-print">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
              <p className="text-sm text-gray-600 mt-0.5">All payments received for this invoice</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Notes</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.payments.map((payment, index) => (
                    <tr key={payment._id || index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5 text-sm text-gray-900">
                        {new Date(payment.paymentDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-3.5 text-sm font-semibold text-green-700">
                        ₹{payment.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-gray-700">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {payment.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-gray-600">
                        {payment.referenceNumber || '-'}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-gray-600">
                        {payment.notes || '-'}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditPaymentModal(payment)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit payment"
                          >
                            <HiPencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/invoices/${params.id}/payments/${payment._id}`)}
                            className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                            title="View payment receipt"
                          >
                            <HiEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(payment._id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete payment"
                          >
                            <HiTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Render the template selected in Invoice Settings */}
        {shopSettings?.invoiceTemplate === 'tally-portrait' ? (
          <TallyPortraitTemplate invoice={invoice} shopSettings={shopSettings} />
        ) : shopSettings?.invoiceTemplate === 'tally-landscape' ? (
          <TallyLandscapeTemplate invoice={invoice} shopSettings={shopSettings} />
        ) : (
          <ModernTemplate invoice={invoice} shopSettings={shopSettings} />
        )}
      </div>

      {/* Payment Modal - Clean & Professional */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto no-print">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity"
              onClick={() => setShowPaymentModal(false)}
            />

            <div className="relative z-50 inline-block w-full max-w-lg p-0 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">
                    {editingPaymentId ? 'Edit Payment' : 'Record Payment'}
                  </h3>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-green-100 mt-1">
                  {editingPaymentId ? 'Update payment details' : 'Add a new payment for this invoice'}
                </p>
              </div>

              {/* Modal Body */}
              <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  {!editingPaymentId && invoice.balanceAmount > 0 && (
                    <p className="text-xs text-gray-600 mt-1.5">
                      Balance Due: ₹{invoice.balanceAmount.toLocaleString('en-IN')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    required
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CREDIT_NOTE">Credit Note</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="Transaction ID, Cheque No., etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                    placeholder="Additional notes (optional)"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-sm"
                  >
                    {editingPaymentId ? 'Update Payment' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto no-print">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity"
              onClick={() => setShowDeleteModal(false)}
            />

            <div className="relative z-50 inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                  <HiTrash className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Payment
                </h3>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete this payment? This will update the invoice balance and cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePayment}
                  className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium"
                >
                  Delete Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @page {
          size: A4 auto;
          margin: 10mm;
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
            width: auto;
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

          /* Make invoice full width and properly positioned */
          .invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0;
            margin: 0;
            width: 100%;
            max-width: 100%;
            background: white;
          }

          /* Prevent awkward page breaks */
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

          /* Avoid breaking these elements across pages */
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
