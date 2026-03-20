'use client';

export default function QuotationTemplate({ quotation, shopSettings }) {
    // Brand color — falls back to indigo if not set
    const brand = shopSettings?.quotationBrandColor || '#4f46e5';

    // Derived color variants (pure CSS, no external lib needed)
    const brandLight = brand + '18'; // ~10% opacity  — very subtle bg tint
    const brandMid   = brand + '33'; // ~20% opacity  — dividers / borders
    const brandStrong = brand + '55'; // ~33% opacity — section bg stripe

    const statusColors = {
        DRAFT:    { bg: '#f3f4f6', text: '#374151' },
        SENT:     { bg: '#dbeafe', text: '#1d4ed8' },
        ACCEPTED: { bg: '#d1fae5', text: '#065f46' },
        REJECTED: { bg: '#fee2e2', text: '#991b1b' },
        EXPIRED:  { bg: '#ffedd5', text: '#9a3412' },
    };
    const statusStyle = statusColors[quotation.status] || statusColors.DRAFT;

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden quotation-print">

            {/* ── TOP HEADER BAND — full brand color ── */}
            <div style={{ backgroundColor: brand }} className="px-8 py-5 flex justify-between items-center">
                {/* Left: Logo + Shop Name */}
                <div className="flex items-center gap-4">
                    {shopSettings?.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={shopSettings.logo}
                            alt={shopSettings.shopName || 'Logo'}
                            className="h-12 object-contain bg-white rounded-lg p-1" />
                    )}
                    <div>
                        <h1 className="text-xl font-extrabold text-white leading-tight">
                            {shopSettings?.shopName || 'Business Name'}
                        </h1>
                        {shopSettings?.gstin && (
                            <p className="text-xs font-medium mt-0.5" style={{ color: brand + 'cc', color: 'rgba(255,255,255,0.75)' }}>
                                GSTIN: {shopSettings.gstin}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right: QUOTATION label + number */}
                <div className="text-right">
                    <p className="text-xs font-bold tracking-[0.25em] uppercase text-white/60">Quotation</p>
                    <p className="text-2xl font-extrabold text-white mt-0.5">
                        {quotation.quotationNumber}
                    </p>
                    <div className="mt-1.5">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                            style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>
                            {quotation.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── META ROW — dates + business address ── */}
            <div style={{ backgroundColor: brandLight, borderBottom: `1px solid ${brandMid}` }}
                className="px-8 py-3 flex justify-between items-start text-sm">
                {/* Business address */}
                {shopSettings && (
                    <div className="text-gray-600 space-y-0.5">
                        {shopSettings.address && <p>{shopSettings.address}</p>}
                        <p>{[shopSettings.city, shopSettings.state, shopSettings.pincode].filter(Boolean).join(', ')}</p>
                        {shopSettings.phone && <p>Phone: {shopSettings.phone}</p>}
                        {shopSettings.email && <p>Email: {shopSettings.email}</p>}
                    </div>
                )}
                {/* Dates */}
                <div className="text-right space-y-1">
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Date</span>
                        <span className="text-sm font-semibold text-gray-800">
                            {new Date(quotation.quotationDate).toLocaleDateString('en-IN')}
                        </span>
                    </div>
                    {quotation.validityDate && (
                        <div className="flex items-center justify-end gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Valid Until</span>
                            <span className="text-sm font-semibold" style={{ color: brand }}>
                                {new Date(quotation.validityDate).toLocaleDateString('en-IN')}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-8 py-6">

                {/* ── QUOTATION FOR — branded pill label ────────────── */}
                <div className="mb-5 p-4 rounded-xl" style={{ backgroundColor: brandLight, borderLeft: `4px solid ${brand}` }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
                        style={{ color: brand }}>Quotation For</p>
                    <p className="font-bold text-gray-900 text-base leading-tight">{quotation.customerName}</p>
                    {quotation.customerPhone && (
                        <p className="text-sm text-gray-600 mt-0.5">Phone: {quotation.customerPhone}</p>
                    )}
                    {quotation.customerAddress && (
                        <p className="text-sm text-gray-600">{quotation.customerAddress}</p>
                    )}
                    {quotation.customerGstin && (
                        <p className="text-sm text-gray-600">GSTIN: {quotation.customerGstin}</p>
                    )}
                </div>

                {/* ── ITEMS TABLE ────────────────────────────────────── */}
                <div className="mb-6 rounded-xl overflow-hidden" style={{ border: `1.5px solid ${brandMid}` }}>
                    <table className="w-full">
                        <thead>
                            {/* Full brand-color header with white text */}
                            <tr style={{ backgroundColor: brand }}>
                                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide">#</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wide">Item</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wide">HSN / SAC</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wide">Qty</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wide">Price</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wide">GST %</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wide">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotation.items.map((item, index) => (
                                <tr key={index}
                                    style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : brandLight }}
                                    className="border-b last:border-b-0"
                                    // eslint-disable-next-line react/forbid-dom-props
                                >
                                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: brand }}>{index + 1}</td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-semibold text-gray-900">
                                            {item.productName || item.product?.name || item.serviceName || item.service?.name || 'N/A'}
                                        </div>
                                        {item.itemType === 'service' && (
                                            <div className="text-[10px] font-bold uppercase tracking-wide mt-0.5"
                                                style={{ color: brand }}>Service</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500 text-center">
                                        {item.hsnCode || item.sacCode || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 text-center font-medium">
                                        {item.quantity} {item.unit}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                        ₹{Number(item.sellingPrice).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center">
                                        <span className="px-2 py-0.5 rounded text-xs font-bold"
                                            style={{ backgroundColor: brandLight, color: brand }}>
                                            {item.gstRate}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">
                                        ₹{Number(item.totalAmount).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── TOTALS ──────────────────────────────────────────── */}
                <div className="flex justify-end mb-6">
                    <div className="w-80 rounded-xl overflow-hidden" style={{ border: `1.5px solid ${brandMid}` }}>
                        {/* Subtotal + tax rows */}
                        <div className="px-5 py-3 space-y-2" style={{ backgroundColor: brandLight }}>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal</span>
                                <span className="font-semibold text-gray-900">₹{Number(quotation.subtotal).toFixed(2)}</span>
                            </div>

                            {quotation.taxType === 'CGST_SGST' && (
                                <>
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>CGST</span>
                                        <span>₹{Number(quotation.totalCGST).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>SGST</span>
                                        <span>₹{Number(quotation.totalSGST).toFixed(2)}</span>
                                    </div>
                                </>
                            )}
                            {quotation.taxType === 'IGST' && (
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>IGST</span>
                                    <span>₹{Number(quotation.totalIGST).toFixed(2)}</span>
                                </div>
                            )}

                            {quotation.discount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Discount</span>
                                    <span className="text-red-500 font-medium">-₹{Number(quotation.discount).toFixed(2)}</span>
                                </div>
                            )}
                            {quotation.roundOff !== 0 && (
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>Round Off</span>
                                    <span>₹{Number(quotation.roundOff).toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        {/* Grand Total — full brand color row */}
                        <div className="flex justify-between items-center px-5 py-4"
                            style={{ backgroundColor: brand }}>
                            <span className="text-base font-bold text-white">Grand Total</span>
                            <span className="text-xl font-extrabold text-white">
                                ₹{Number(quotation.grandTotal).toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── NOTES ───────────────────────────────────────────── */}
                {quotation.notes && (
                    <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: brandLight, borderLeft: `3px solid ${brand}` }}>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
                            style={{ color: brand }}>Notes</h3>
                        <p className="text-sm text-gray-700 leading-relaxed">{quotation.notes}</p>
                    </div>
                )}

                {/* ── TERMS & CONDITIONS ──────────────────────────────── */}
                {quotation.terms && (
                    <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: brandLight, borderLeft: `3px solid ${brand}` }}>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
                            style={{ color: brand }}>Terms &amp; Conditions</h3>
                        <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                            {quotation.terms}
                        </p>
                    </div>
                )}

                {/* ── FOOTER ──────────────────────────────────────────── */}
                <div className="mt-6 pt-4 text-center" style={{ borderTop: `2px solid ${brandMid}` }}>
                    <p className="text-sm font-medium" style={{ color: brand }}>
                        This is a quotation and not a final invoice.
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Computer generated document.</p>
                </div>
            </div>
        </div>
    );
}
