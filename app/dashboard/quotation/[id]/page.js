'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { quotationsAPI, shopAPI } from '@/utils/api';
import QuotationTemplate from '@/components/quotation-templates/QuotationTemplate';
import { HiPencil, HiTrash, HiPrinter, HiDocumentText } from 'react-icons/hi';

const STATUS_COLOR = {
  DRAFT:    'bg-gray-100 text-gray-700',
  SENT:     'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED:  'bg-orange-100 text-orange-700',
};

export default function QuotationDetail() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const toast = useToast();

  const [quotation, setQuotation] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    else if (user) loadData();
  }, [user, loading]);

  const loadData = async () => {
    try {
      const [quotationData, shopData] = await Promise.all([
        quotationsAPI.getOne(params.id),
        shopAPI.get(),
      ]);
      setQuotation(quotationData);
      setShopSettings(shopData);
    } catch (error) {
      toast.error(error.message || 'Failed to load quotation');
    } finally {
      setLoadingData(false);
    }
  };

  const handlePrint = () => window.print();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await quotationsAPI.delete(params.id);
      toast.success('Quotation deleted');
      router.push('/dashboard/quotation');
    } catch (error) {
      toast.error(error.message || 'Failed to delete quotation');
    } finally {
      setDeleting(false);
    }
  };

  const handleConvertToInvoice = () => {
    // Redirect to invoice creation page with quotation data
    router.push(`/dashboard/invoices/new?fromQuotation=${params.id}`);
  };

  if (loading || !user) return null;

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 auto;
          margin: 10mm;
        }

        @media print {
          * {
            visibility: hidden;
          }

          .quotation-print,
          .quotation-print * {
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

          /* Make quotation full width and properly positioned */
          .quotation-print {
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
          .rounded-xl,
          .space-y-4 {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <DashboardLayout>
        {loadingData ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <LoadingSpinner size="lg" text="Loading quotation..." />
          </div>
        ) : (
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Action Bar */}
          <div className="no-print flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/dashboard/quotation')}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                ← Quotations
              </button>
              {quotation && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[quotation.status] || STATUS_COLOR.DRAFT}`}>
                  {quotation.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Convert to Invoice */}
              {quotation?.status === 'ACCEPTED' && !quotation?.convertedToInvoiceId && (
                <button onClick={handleConvertToInvoice}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium">
                  <HiDocumentText className="w-4 h-4" />
                  Convert to Invoice
                </button>
              )}
              {/* Already converted — show link to the invoice */}
              {quotation?.convertedToInvoiceId && (
                <button onClick={() => router.push(`/dashboard/invoices/${quotation.convertedToInvoiceId}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium">
                  <HiDocumentText className="w-4 h-4" />
                  View Invoice
                </button>
              )}
              <button onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
                <HiPrinter className="w-4 h-4" />
                Print / PDF
              </button>
              <button onClick={() => router.push(`/dashboard/quotation/${params.id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                <HiPencil className="w-4 h-4" />
                Edit
              </button>
              <button onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium">
                <HiTrash className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>

          {/* Quotation Template */}
          {quotation && (
            <QuotationTemplate quotation={quotation} shopSettings={shopSettings} />
          )}
        </div>
        )}
      </DashboardLayout>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <HiTrash className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Quotation?</h3>
            <p className="text-sm text-gray-500 mb-2">
              <span className="font-semibold text-gray-700">{quotation?.quotationNumber}</span> will be permanently deleted.
            </p>
            <p className="text-xs text-red-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-60">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
