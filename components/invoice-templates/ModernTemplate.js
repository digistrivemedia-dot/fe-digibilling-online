'use client';

export default function ModernTemplate({ invoice, shopSettings }) {
    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 invoice-print">
            {/* Header */}
            <div className="border-b-2 border-gray-800 pb-6 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        {shopSettings?.logo && (
                            <div className="mb-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={shopSettings.logo} alt={shopSettings.shopName || 'Shop Logo'} className="h-16 object-contain" />
                            </div>
                        )}
                        <h1 className="text-3xl font-bold text-gray-900">
                            {shopSettings?.shopName || 'Business Name'}
                        </h1>
                        {shopSettings && (
                            <div className="mt-2 text-sm text-gray-600 space-y-1">
                                <p>{shopSettings.address}</p>
                                <p>{shopSettings.city}, {shopSettings.state} - {shopSettings.pincode}</p>
                                <p>Phone: {shopSettings.phone}</p>
                                {shopSettings.email && <p>Email: {shopSettings.email}</p>}
                                <p className="font-semibold">GSTIN: {shopSettings.gstin}</p>
                            </div>
                        )}
                    </div>

                    <div className="text-right">
                        <div className={`inline-block px-4 py-2 rounded-lg ${shopSettings?.gstScheme === 'COMPOSITION' ? 'bg-green-600' : 'bg-blue-600'} text-white`}>
                            <p className="text-sm font-medium">
                                {shopSettings?.gstScheme === 'COMPOSITION' ? 'BILL OF SUPPLY' : 'TAX INVOICE'}
                            </p>
                        </div>
                        <p className="mt-4 text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-gray-600 mt-1">
                            Date: {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Customer Details — Bill To + optional Ship To */}
            <div className="mb-6">
                {(invoice.shipToName || invoice.shipToAddress) ? (
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Bill To:</h2>
                            <div className="text-gray-900">
                                <p className="font-semibold text-lg">{invoice.customerName}</p>
                                {invoice.customerPhone && <p className="text-sm">Phone: {invoice.customerPhone}</p>}
                                {invoice.customerAddress && <p className="text-sm">{invoice.customerAddress}</p>}
                                {invoice.customerGstin && <p className="text-sm">GSTIN: {invoice.customerGstin}</p>}
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Ship To:</h2>
                            <div className="text-gray-900">
                                <p className="font-semibold text-lg">{invoice.shipToName || invoice.customerName}</p>
                                {invoice.shipToAddress && <p className="text-sm">{invoice.shipToAddress}</p>}
                                {(invoice.shipToCity || invoice.shipToState) && (
                                    <p className="text-sm">{[invoice.shipToCity, invoice.shipToState, invoice.shipToPincode].filter(Boolean).join(', ')}</p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <h2 className="text-sm font-semibold text-gray-600 uppercase mb-2">Bill To:</h2>
                        <div className="text-gray-900">
                            <p className="font-semibold text-lg">{invoice.customerName}</p>
                            {invoice.customerPhone && <p className="text-sm">Phone: {invoice.customerPhone}</p>}
                            {invoice.customerAddress && <p className="text-sm">{invoice.customerAddress}</p>}
                            {invoice.customerGstin && <p className="text-sm">GSTIN: {invoice.customerGstin}</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* Purchase Order & e-Way Bill Reference */}
            {(invoice.poNumber || invoice.poDate || invoice.eWayBillNumber) && (
                <div className="mb-6 flex gap-6 text-sm">
                    {invoice.poNumber && (
                        <div>
                            <span className="text-gray-500 font-medium">P.O. No.: </span>
                            <span className="text-gray-900 font-semibold">{invoice.poNumber}</span>
                        </div>
                    )}
                    {invoice.poDate && (
                        <div>
                            <span className="text-gray-500 font-medium">P.O. Date: </span>
                            <span className="text-gray-900 font-semibold">{new Date(invoice.poDate).toLocaleDateString('en-IN')}</span>
                        </div>
                    )}
                    {invoice.eWayBillNumber && (
                        <div>
                            <span className="text-gray-500 font-medium">e-Way Bill No.: </span>
                            <span className="text-gray-900 font-semibold">{invoice.eWayBillNumber}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Items Table */}
            <div className="mb-6">
                <table className="w-full">
                    <thead className="bg-gray-100 border-y border-gray-300">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">#</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">HSN</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Qty</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Price</th>
                            {shopSettings?.gstScheme !== 'COMPOSITION' && <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">GST %</th>}
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {invoice.items.map((item, index) => (
                            <tr key={index}>
                                <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                                <td className="px-4 py-3">
                                    <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                                    {((item.batchNo && shopSettings?.invBatchNumber !== false) || (item.expiryDate && shopSettings?.invExpiryDate !== false) || item.serialNumber) && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            {item.batchNo && shopSettings?.invBatchNumber !== false && <span>Batch: {item.batchNo}</span>}
                                            {item.batchNo && shopSettings?.invBatchNumber !== false && item.expiryDate && shopSettings?.invExpiryDate !== false && <span> | </span>}
                                            {item.expiryDate && shopSettings?.invExpiryDate !== false && <span>Exp: {new Date(item.expiryDate).toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' })}</span>}
                                            {((item.batchNo && shopSettings?.invBatchNumber !== false) || (item.expiryDate && shopSettings?.invExpiryDate !== false)) && item.serialNumber && <span> | </span>}
                                            {item.serialNumber && <span>S/N: {item.serialNumber}</span>}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.hsnCode || item.sacCode || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.quantity} {item.unit}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">₹{item.sellingPrice.toFixed(2)}</td>
                                {shopSettings?.gstScheme !== 'COMPOSITION' && <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.gstRate}%</td>}
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">₹{item.totalAmount.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
                <div className="w-80">
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium text-black">₹{invoice.subtotal.toFixed(2)}</span>
                        </div>
                        {invoice.discount > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Discount:</span>
                                <span className="font-medium text-black">-₹{invoice.discount.toFixed(2)}</span>
                            </div>
                        )}
                        {shopSettings?.gstScheme !== 'COMPOSITION' && (
                            invoice.taxType === 'CGST_SGST' ? (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">CGST:</span>
                                        <span className="font-medium text-black">₹{invoice.totalCGST.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">SGST:</span>
                                        <span className="font-medium text-black">₹{invoice.totalSGST.toFixed(2)}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">IGST:</span>
                                    <span className="font-medium text-black">₹{invoice.totalIGST.toFixed(2)}</span>
                                </div>
                            )
                        )}
                        {invoice.roundOff !== 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Round Off:</span>
                                <span className="font-medium text-black">₹{invoice.roundOff.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="pt-3 border-t-2 border-gray-800">
                            <div className="flex justify-between text-lg font-bold">
                                <span className="text-black">Grand Total:</span>
                                <span className="text-black">₹{invoice.grandTotal.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-gray-300">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Paid Amount:</span>
                                <span className="font-medium text-green-600">₹{invoice.paidAmount.toLocaleString('en-IN')}</span>
                            </div>
                            {invoice.balanceAmount > 0 && (
                                <div className="flex justify-between mt-1">
                                    <span className="text-gray-600">Balance Due:</span>
                                    <span className="font-bold text-red-600">₹{invoice.balanceAmount.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bank Details */}
            {(shopSettings?.invBankName || shopSettings?.invAccountNumber || shopSettings?.invQrCode) && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Bank Details:</h3>
                    <div className="flex justify-between items-start gap-6">
                        <div className="text-sm text-gray-600 space-y-0.5 flex-1">
                            {shopSettings.invAccountHolder && <p>A/C Holder: {shopSettings.invAccountHolder}</p>}
                            {shopSettings.invBankName && <p>Bank: {shopSettings.invBankName}</p>}
                            {shopSettings.invAccountNumber && <p>A/C No: {shopSettings.invAccountNumber}</p>}
                            {shopSettings.invIfscCode && <p>IFSC: {shopSettings.invIfscCode}</p>}
                            {shopSettings.invBranchName && <p>Branch: {shopSettings.invBranchName}</p>}
                        </div>
                        {shopSettings.invQrCode && (
                            <div className="flex-shrink-0">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">QR Code</p>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={shopSettings.invQrCode} alt="QR Code" className="w-32 h-32 border-2 border-gray-200 rounded-lg object-contain" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Transport / Dispatch Details — only if any value exists */}
            {(invoice.transporterName || invoice.vehicleNumber || invoice.transportDocNumber ||
                invoice.transportMode || invoice.pos || invoice.approxDist || invoice.supplyDate) && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Dispatch / Transport Details:</h3>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                            {invoice.transportMode && (
                                <p><span className="font-medium">Transport Mode: </span>{invoice.transportMode}</p>
                            )}
                            {invoice.transporterName && (
                                <p><span className="font-medium">Transporter: </span>{invoice.transporterName}</p>
                            )}
                            {invoice.transporterId && (
                                <p><span className="font-medium">Transporter ID: </span>{invoice.transporterId}</p>
                            )}
                            {invoice.vehicleNumber && (
                                <p><span className="font-medium">Vehicle No.: </span>{invoice.vehicleNumber}</p>
                            )}
                            {invoice.transportDocNumber && (
                                <p><span className="font-medium">Dispatch Doc No.: </span>{invoice.transportDocNumber}</p>
                            )}
                            {invoice.transportDocDate && (
                                <p><span className="font-medium">Dispatch Date: </span>{new Date(invoice.transportDocDate).toLocaleDateString('en-IN')}</p>
                            )}
                            {invoice.approxDist && (
                                <p><span className="font-medium">Distance: </span>{invoice.approxDist} km</p>
                            )}
                            {invoice.pos && (
                                <p><span className="font-medium">Place of Supply: </span>{invoice.pos}</p>
                            )}
                            {invoice.supplyDate && (
                                <p><span className="font-medium">Supply Date: </span>{new Date(invoice.supplyDate).toLocaleDateString('en-IN')}</p>
                            )}
                        </div>
                    </div>
                )}

            {/* Additional Invoice Details — only if any value exists */}
            {(invoice.eWayBillNumber || invoice.deliveryNote || invoice.referenceNo ||
                invoice.otherReferences || invoice.termsOfDelivery || invoice.destination) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Additional Details:</h3>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                            {invoice.eWayBillNumber && (
                                <p><span className="font-medium">E-Way Bill No.: </span>{invoice.eWayBillNumber}</p>
                            )}
                            {invoice.deliveryNote && (
                                <p><span className="font-medium">Delivery Note: </span>{invoice.deliveryNote}</p>
                            )}
                            {invoice.referenceNo && (
                                <p><span className="font-medium">Reference No.: </span>{invoice.referenceNo}</p>
                            )}
                            {invoice.otherReferences && (
                                <p><span className="font-medium">Other References: </span>{invoice.otherReferences}</p>
                            )}
                            {invoice.termsOfDelivery && (
                                <p><span className="font-medium">Terms of Delivery: </span>{invoice.termsOfDelivery}</p>
                            )}
                            {invoice.destination && (
                                <p><span className="font-medium">Destination: </span>{invoice.destination}</p>
                            )}
                        </div>
                    </div>
                )}

            {/* Payment Info */}
            <div className="mt-6 pt-6 border-t border-gray-300">
                <div className="text-sm">
                    <div className="mb-3">
                        <span className="text-gray-600">Payment Status: </span>
                        <span className={`font-semibold ${invoice.paymentStatus === 'PAID' ? 'text-green-600' : invoice.paymentStatus === 'PARTIAL' ? 'text-yellow-600' : 'text-red-600'}`}>
                            {invoice.paymentStatus}
                        </span>
                    </div>
                    {invoice.payments && invoice.payments.length > 0 ? (
                        <div>
                            <span className="text-gray-600">Payment Details: </span>
                            <span className="text-black">
                                {invoice.payments.map((payment, index) => (
                                    <span key={index}>
                                        {index > 0 && ', '}
                                        ₹{payment.amount.toLocaleString('en-IN')} via {payment.paymentMethod}
                                        {' '}on {new Date(payment.paymentDate).toLocaleDateString('en-IN')}
                                        {payment.referenceNumber && ` (Ref: ${payment.referenceNumber})`}
                                    </span>
                                ))}
                            </span>
                        </div>
                    ) : (
                        <div>
                            <span className="text-gray-600">Payment Method: </span>
                            <span className="font-semibold text-black">{invoice.paymentMethod}</span>
                        </div>
                    )}
                </div>
                {invoice.notes && <p className="text-sm text-gray-600 mt-3">Notes: {invoice.notes}</p>}
            </div>

            {/* Terms & Conditions */}
            {(shopSettings?.invoiceTerms || shopSettings?.termsAndConditions) && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Terms & Conditions:</h3>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {shopSettings.invoiceTerms || shopSettings.termsAndConditions}
                    </p>
                </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-300 text-center">
                <p className="text-sm text-gray-600">Thank you for your business!</p>
                <p className="text-xs text-gray-500 mt-2">
                    This is a computer generated invoice and does not require signature.
                </p>
            </div>
        </div>
    );
}
