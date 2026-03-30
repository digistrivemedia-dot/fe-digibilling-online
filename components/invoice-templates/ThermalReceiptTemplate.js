'use client';

export default function ThermalReceiptTemplate({ invoice, shopSettings, type = 'invoice' }) {
    const isBOS = shopSettings?.gstScheme === 'COMPOSITION';

    // For BOS/Composition: recalculate totals on-the-fly
    const displaySubtotal = isBOS
        ? invoice.items.reduce((s, i) => s + (i.sellingPrice * i.quantity), 0)
        : invoice.subtotal;
    const discountAmt = invoice.discount || 0;
    const displayGrandTotal = isBOS
        ? Math.round(displaySubtotal - discountAmt)
        : invoice.grandTotal;

    return (
        <>
            <style jsx global>{`
                @media print {
                    @page { size: 80mm auto; margin: 5mm 3mm; }
                    .thermal-print {
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                }
            `}</style>

            <div className="flex justify-center my-8">
                <div className="invoice-print thermal-print bg-white p-4 shadow-md rounded border border-gray-200 mx-auto" 
                     style={{ width: '80mm', maxWidth: '80mm', fontFamily: "'Courier New', Courier, monospace", fontSize: '11px', color: '#000' }}>
                    
                    {/* Header */}
                    <div className="text-center border-b-2 border-dashed border-gray-800 pb-2 mb-2">
                        <div className="text-base font-bold uppercase mb-1">{shopSettings?.shopName || 'SHOP NAME'}</div>
                        {shopSettings?.address && <div className="text-[10px]">{shopSettings.address}</div>}
                        <div className="text-[10px]">
                            {[shopSettings?.city, shopSettings?.state, shopSettings?.pincode].filter(Boolean).join(', ')}
                        </div>
                        {shopSettings?.phone && <div className="text-[10px] mt-0.5">Ph: {shopSettings.phone}</div>}
                        {shopSettings?.gstin && <div className="text-[10px] mt-0.5">GSTIN: {shopSettings.gstin}</div>}
                    </div>

                    {/* Invoice Type & Number */}
                    <div className="text-center mb-2">
                        <div className="text-[13px] font-bold uppercase">
                            {type === 'proforma' ? 'PROFORMA INVOICE' : type === 'challan' ? 'DELIVERY CHALLAN' : (isBOS ? 'BILL OF SUPPLY' : 'TAX INVOICE')}
                        </div>
                        <div className="text-[11px] mt-0.5">{invoice.invoiceNumber || invoice.proformaNumber || invoice.challanNumber}</div>
                        <div className="text-[10px] text-gray-700">
                            {new Date(invoice.invoiceDate || invoice.proformaDate || invoice.challanDate || new Date()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {' '}
                            {new Date(invoice.invoiceDate || invoice.proformaDate || invoice.challanDate || new Date()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>

                    {/* Customer Info */}
                    {invoice.customerName && (
                        <div className="border-y border-dashed border-gray-800 py-1.5 mb-2 text-[10px]">
                            <div className="font-bold">Customer: {invoice.customerName}</div>
                            {invoice.customerPhone && <div className="mt-0.5">Ph: {invoice.customerPhone}</div>}
                            {invoice.customerGstin && <div className="mt-0.5">GSTIN: {invoice.customerGstin}</div>}
                        </div>
                    )}

                    {/* Items Table */}
                    <div className="mb-2 w-full">
                        <div className="text-left py-1 text-[11px] font-bold border-b-2 border-gray-800 w-full">
                            ITEM DETAILS
                        </div>
                        <div className="w-full mt-1">
                            {invoice.items.map((item, i) => {
                                // For proformas and challans, totalAmount might be missing, so calculate it
                                const itemTotal = isBOS ? (item.sellingPrice * item.quantity) : (item.totalAmount !== undefined ? item.totalAmount : (item.quantity * item.sellingPrice * (1 + (item.gstRate || 0)/100)));
                                
                                return (
                                    <div key={i} className="border-b border-dashed border-gray-300 py-1">
                                        <div className="font-bold text-[11px] break-words">{item.productName || item.serviceName || 'Item'}</div>
                                        {item.hsnCode && <div className="text-[9px] text-gray-600">HSN: {item.hsnCode}</div>}
                                        {(item.batchNo || item.expiryDate) && (
                                            <div className="text-[9px] text-gray-600">
                                                {item.batchNo && `Batch: ${item.batchNo}`}
                                                {item.batchNo && item.expiryDate && ' | '}
                                                {item.expiryDate && `Exp: ${new Date(item.expiryDate).toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' })}`}
                                            </div>
                                        )}
                                        <div className="flex justify-between items-end mt-0.5">
                                            <div className="w-[55%] text-[10px] text-gray-700 leading-tight">
                                                {item.quantity} {item.unit} &times; <span className="font-sans">₹</span>{item.sellingPrice.toFixed(2)}
                                                {!isBOS && item.gstRate ? ` @ ${item.gstRate}%` : ''}
                                            </div>
                                            <div className="w-[45%] text-right text-[11px] font-bold">
                                                <span className="font-sans">₹</span>{itemTotal.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Totals Section */}
                    <div className="border-t-2 border-gray-800 pt-1.5 mt-2">
                        <table className="w-full text-[11px]">
                            <tbody>
                                <tr>
                                    <td className="py-0.5">Subtotal:</td>
                                    <td className="text-right py-0.5"><span className="font-sans">₹</span>{displaySubtotal.toFixed(2)}</td>
                                </tr>
                                {!isBOS && (invoice.taxType === 'CGST_SGST' ? (
                                    <>
                                        <tr>
                                            <td className="py-0.5">CGST:</td>
                                            <td className="text-right py-0.5"><span className="font-sans">₹</span>{(invoice.totalCGST || 0).toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-0.5">SGST:</td>
                                            <td className="text-right py-0.5"><span className="font-sans">₹</span>{(invoice.totalSGST || 0).toFixed(2)}</td>
                                        </tr>
                                    </>
                                ) : (
                                    <tr>
                                        <td className="py-0.5">IGST:</td>
                                        <td className="text-right py-0.5"><span className="font-sans">₹</span>{(invoice.totalIGST || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                                {invoice.discount > 0 && (
                                    <tr>
                                        <td className="py-0.5">Discount:</td>
                                        <td className="text-right py-0.5">-<span className="font-sans">₹</span>{invoice.discount.toFixed(2)}</td>
                                    </tr>
                                )}
                                {invoice.roundOff !== 0 && (
                                    <tr>
                                        <td className="py-0.5">Round Off:</td>
                                        <td className="text-right py-0.5"><span className="font-sans">₹</span>{invoice.roundOff.toFixed(2)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Grand Total */}
                    <div className="border-y-2 border-gray-800 py-1.5 mt-1 mb-2">
                        <table className="w-full text-[14px] font-bold">
                            <tbody>
                                <tr>
                                    <td>TOTAL:</td>
                                    <td className="text-right"><span className="font-sans">₹</span>{displayGrandTotal.toLocaleString('en-IN')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Payment Info */}
                    {type === 'invoice' && invoice.paymentStatus && (
                        <div className="text-[10px] mb-2">
                            <table className="w-full">
                                <tbody>
                                    <tr>
                                        <td className="py-0.5">Paid:</td>
                                        <td className="text-right py-0.5 font-bold"><span className="font-sans">₹</span>{(invoice.paidAmount || 0).toLocaleString('en-IN')}</td>
                                    </tr>
                                    {invoice.balanceAmount > 0 && (
                                        <tr>
                                            <td className="py-0.5">Balance:</td>
                                            <td className="text-right py-0.5 font-bold"><span className="font-sans">₹</span>{invoice.balanceAmount.toLocaleString('en-IN')}</td>
                                        </tr>
                                    )}
                                    <tr>
                                        <td className="py-0.5">Payment:</td>
                                        <td className="text-right py-0.5">{invoice.paymentStatus || 'N/A'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Notes */}
                    {invoice.notes && (
                        <div className="border-t border-dashed border-gray-800 pt-1.5 mt-1.5 text-[9px] text-gray-700">
                            <div className="font-bold mb-0.5">Notes:</div>
                            <div className="whitespace-pre-wrap">{invoice.notes}</div>
                        </div>
                    )}

                    {/* Terms */}
                    {(shopSettings?.invoiceTerms || shopSettings?.termsAndConditions) && (
                        <div className="border-t border-dashed border-gray-800 pt-1.5 mt-1.5 text-[9px] text-gray-700">
                            <div className="font-bold mb-0.5">Terms & Conditions:</div>
                            <div className="whitespace-pre-wrap">{shopSettings.invoiceTerms || shopSettings.termsAndConditions}</div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="text-center mt-3 pt-2 border-t-2 border-dashed border-gray-800 text-[10px]">
                        <div className="font-bold mb-1">Thank You! Visit Again!</div>
                        <div className="text-[8px] text-gray-500">This is a computer generated receipt</div>
                    </div>
                </div>
            </div>
        </>
    );
}
