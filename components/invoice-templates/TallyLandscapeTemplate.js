'use client';

import { getStateCode } from '@/utils/stateCodes';
import { buildHsnSummary } from '@/utils/calculations';

const B = '1px solid #000';
const BD = '1px dashed #bbb';

// --- Indian currency: number to words ---
function numToWords(n) {
    if (n === 0) return 'Zero';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const toH = (x) => {
        if (x === 0) return '';
        if (x < 20) return ones[x] + ' ';
        if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '') + ' ';
        return ones[Math.floor(x / 100)] + ' Hundred ' + toH(x % 100);
    };
    let r = '';
    const cr = Math.floor(n / 10000000);
    const lk = Math.floor((n % 10000000) / 100000);
    const th = Math.floor((n % 100000) / 1000);
    const rest = n % 1000;
    if (cr) r += toH(cr) + 'Crore ';
    if (lk) r += toH(lk) + 'Lakh ';
    if (th) r += toH(th) + 'Thousand ';
    if (rest) r += toH(rest);
    return r.trim();
}

function rupeeWords(amount) {
    const rs = Math.floor(amount);
    const ps = Math.round((amount - rs) * 100);
    let w = 'Indian Rupee ' + numToWords(rs);
    if (ps > 0) w += ' and ' + numToWords(ps) + ' Paise';
    return w + ' Only';
}

export default function TallyLandscapeTemplate({ invoice, shopSettings }) {
    const isBOS = shopSettings?.gstScheme === 'COMPOSITION';
    const hasTerms = shopSettings?.invoiceTerms || shopSettings?.termsAndConditions;
    const hasBankDetails = shopSettings?.invBankName || shopSettings?.invAccountNumber;

    const hsnRows = buildHsnSummary(invoice.items, invoice.taxType);
    const totalTaxAmt = isBOS ? 0 : invoice.taxType === 'CGST_SGST'
        ? (invoice.totalCGST + invoice.totalSGST)
        : invoice.totalIGST;

    // Right-side invoice detail rows
    const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '';
    const invoiceDetailRows = [
        ['Invoice No.', invoice.invoiceNumber, 'Dated', fmt(invoice.invoiceDate)],
        ['Delivery Note', invoice.deliveryNote || '', 'Mode/Terms of Payment', invoice.paymentMethod || ''],
        ['Reference No. & Date.', invoice.referenceNo || '', invoice.eWayBillNumber ? 'e-Way Bill No.' : 'Other References', invoice.eWayBillNumber ? invoice.eWayBillNumber + (invoice.otherReferences ? ` (${invoice.otherReferences})` : '') : (invoice.otherReferences || '')],
        ["Buyer's Order No.", invoice.poNumber || '', 'Dated', fmt(invoice.poDate)],
        ['Dispatch Doc No.', invoice.transportDocNumber || '', 'Delivery Note Date', fmt(invoice.transportDocDate)],
        ['Dispatched through', [invoice.transporterName, invoice.vehicleNumber].filter(Boolean).join(' | '), 'Destination', invoice.destination || invoice.pos || invoice.customerCity || ''],
    ];

    const tdLabel = { padding: '3px 4px', borderBottom: BD, color: '#555', fontSize: '10px', width: '28%' };
    const tdValue = { padding: '3px 4px', borderBottom: BD, fontSize: '10px', width: '22%' };

    // Landscape items: taxable + cgst/sgst/igst + total columns
    const colCount = isBOS ? 8 : 10;

    return (
        <>
            {/* Landscape print override */}
            <style jsx global>{`
                @media print {
                    @page { size: A4 landscape; margin: 8mm; }
                    .invoice-print {
                        width: 277mm !important;
                        max-width: 277mm !important;
                        padding: 0 !important;
                    }
                }
            `}</style>

            <div className="invoice-print bg-white p-4 sm:p-8 rounded-lg shadow-sm border border-gray-200" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000', overflowX: 'auto' }}>

                {/* ── Business Header (two-col for landscape) ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: B, paddingBottom: '5px', marginBottom: '0' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        {shopSettings?.logo && (
                            <div style={{ flexShrink: 0 }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={shopSettings.logo} alt="Logo" style={{ height: '50px', width: 'auto', objectFit: 'contain' }} />
                            </div>
                        )}
                        <div>
                            <div style={{ fontSize: '17px', fontWeight: 'bold' }}>{shopSettings?.shopName || 'Business Name'}</div>
                            {shopSettings?.address && <div style={{ fontSize: '10px' }}>{shopSettings.address}</div>}
                            <div style={{ fontSize: '10px' }}>
                                {[shopSettings?.city, shopSettings?.state].filter(Boolean).join(', ')}
                                {shopSettings?.pincode ? ` - ${shopSettings.pincode}` : ''}
                            </div>
                            <div style={{ fontSize: '10px' }}>
                                {shopSettings?.phone && `Ph: ${shopSettings.phone}`}
                                {shopSettings?.phone && shopSettings?.email && ' | '}
                                {shopSettings?.email && `Email: ${shopSettings.email}`}
                            </div>
                            {shopSettings?.gstin && (
                                <div style={{ fontSize: '10px', fontWeight: 'bold' }}>GSTIN/UIN: {shopSettings.gstin}</div>
                            )}
                        </div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', border: B, padding: '3px 12px', marginTop: '4px' }}>
                        {isBOS ? 'BILL OF SUPPLY' : 'TAX INVOICE'}
                    </div>
                </div>

                {/* ── Consignee / Buyer  +  Invoice Details ─── */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            {/* Left: Consignee + Buyer */}
                            <td style={{ width: '52%', border: B, borderTop: 'none', padding: '0', verticalAlign: 'top' }}>
                                <div style={{ padding: '4px 5px', borderBottom: BD }}>
                                    <div style={{ fontSize: '9px', color: '#555', marginBottom: '1px' }}>Consignee (Ship to)</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                                        {invoice.shipToName || invoice.customerName}
                                    </div>
                                    {invoice.shipToAddress
                                        ? <div style={{ fontSize: '10px' }}>{invoice.shipToAddress}</div>
                                        : invoice.customerAddress && <div style={{ fontSize: '10px' }}>{invoice.customerAddress}</div>
                                    }
                                    {(invoice.shipToCity || invoice.shipToState)
                                        ? <div style={{ fontSize: '10px' }}>{[invoice.shipToCity, invoice.shipToState, invoice.shipToPincode].filter(Boolean).join(', ')}</div>
                                        : null
                                    }
                                    {invoice.customerGstin
                                        ? <div style={{ fontSize: '10px' }}>GSTIN/UIN : <strong>{invoice.customerGstin}</strong></div>
                                        : <div style={{ fontSize: '10px' }}>GSTIN/UIN : </div>
                                    }
                                    <div style={{ fontSize: '10px' }}>
                                        State Name : <strong>{invoice.shipToState || invoice.customerState || ''}</strong>
                                        &nbsp;&nbsp;&nbsp;
                                        Code : <strong>{getStateCode(invoice.shipToState || invoice.customerState || '')}</strong>
                                    </div>
                                </div>
                                <div style={{ padding: '4px 5px' }}>
                                    <div style={{ fontSize: '9px', color: '#555', marginBottom: '1px' }}>Buyer (Bill to)</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{invoice.customerName}</div>
                                    {invoice.customerAddress && <div style={{ fontSize: '10px' }}>{invoice.customerAddress}</div>}
                                    {invoice.customerPhone && <div style={{ fontSize: '10px' }}>Ph: {invoice.customerPhone}</div>}
                                    {invoice.customerGstin
                                        ? <div style={{ fontSize: '10px' }}>GSTIN/UIN : <strong>{invoice.customerGstin}</strong></div>
                                        : <div style={{ fontSize: '10px' }}>GSTIN/UIN : </div>
                                    }
                                    <div style={{ fontSize: '10px' }}>
                                        State Name : <strong>{invoice.customerState || ''}</strong>
                                        &nbsp;&nbsp;&nbsp;
                                        Code : <strong>{getStateCode(invoice.customerState || '')}</strong>
                                    </div>
                                </div>
                            </td>
                            {/* Right: Invoice detail fields */}
                            <td style={{ width: '48%', border: B, borderTop: 'none', borderLeft: 'none', padding: '0', verticalAlign: 'top' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {invoiceDetailRows
                                            .filter(([, v1, , v2]) => v1 || v2)
                                            .map(([l1, v1, l2, v2], i) => (
                                                <tr key={i}>
                                                    <td style={tdLabel}>{l1}</td>
                                                    <td style={{ ...tdValue, borderRight: B, fontWeight: l1 === 'Invoice No.' ? 'bold' : 'normal' }}>{v1}</td>
                                                    <td style={tdLabel}>{l2}</td>
                                                    <td style={tdValue}>{v2}</td>
                                                </tr>
                                            ))}
                                        <tr>
                                            <td style={{ ...tdLabel, borderBottom: 'none' }}>Terms of Delivery</td>
                                            <td colSpan={3} style={{ padding: '3px 4px', fontSize: '10px' }}>{invoice.termsOfDelivery || ''}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── Items Table (landscape: extra tax columns) ── */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f0f0f0' }}>
                            <th style={{ border: B, borderTop: 'none', padding: '3px 2px', textAlign: 'center', width: '4%', fontSize: '10px' }}>Sl<br />No.</th>
                            <th style={{ border: B, borderTop: 'none', padding: '3px 2px', textAlign: 'left', fontSize: '10px' }}>Description of Goods</th>
                            <th style={{ border: B, borderTop: 'none', padding: '3px 2px', textAlign: 'center', width: '7%', fontSize: '10px' }}>HSN/<br />SAC</th>
                            <th style={{ border: B, borderTop: 'none', padding: '3px 2px', textAlign: 'center', width: '6%', fontSize: '10px' }}>Qty</th>
                            <th style={{ border: B, borderTop: 'none', padding: '3px 2px', textAlign: 'center', width: '4%', fontSize: '10px' }}>per</th>
                            <th style={{ border: B, borderTop: 'none', padding: '3px 2px', textAlign: 'right', width: '8%', fontSize: '10px' }}>Rate</th>
                            <th style={{ border: B, borderTop: 'none', padding: '3px 2px', textAlign: 'center', width: '5%', fontSize: '10px' }}>Disc.<br />(₹)</th>
                            <th style={{ border: B, borderTop: 'none', padding: '3px 2px', textAlign: 'right', width: '9%', fontSize: '10px' }}>Taxable<br />Amt</th>
                            {!isBOS && <th style={{ border: B, borderTop: 'none', padding: '3px 2px', textAlign: 'center', width: '5%', fontSize: '10px' }}>GST<br />%</th>}
                            {!isBOS && <th style={{ border: B, borderTop: 'none', padding: '3px 2px', textAlign: 'right', width: '8%', fontSize: '10px' }}>Tax<br />Amt</th>}
                            <th style={{ border: B, borderTop: 'none', padding: '3px 2px', textAlign: 'right', width: '9%', fontSize: '10px' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item, index) => {
                            const discountAmt = item.discountAmount || 0;
                            // taxableAmount is after discount — what GST is applied on
                            const taxableAmt = item.taxableAmount !== undefined ? item.taxableAmount : (item.sellingPrice * item.quantity - discountAmt);
                            // Tax amount = totalAmount - taxableAmount
                            const taxAmt = item.totalAmount - taxableAmt;
                            return (
                                <tr key={`item-${index}`}>
                                    <td style={{ border: B, padding: '3px 2px', textAlign: 'center', fontSize: '10px' }}>{index + 1}</td>
                                    <td style={{ border: B, padding: '3px 2px', fontSize: '10px' }}>
                                        <div style={{ fontWeight: 'bold' }}>{item.productName}</div>
                                        {((item.batchNo && shopSettings?.invBatchNumber !== false) || (item.expiryDate && shopSettings?.invExpiryDate !== false) || item.serialNumber) && (
                                            <div style={{ fontSize: '9px', color: '#555' }}>
                                                {item.batchNo && shopSettings?.invBatchNumber !== false && `Batch: ${item.batchNo}`}
                                                {item.batchNo && shopSettings?.invBatchNumber !== false && item.expiryDate && shopSettings?.invExpiryDate !== false && ' | '}
                                                {item.expiryDate && shopSettings?.invExpiryDate !== false && `Exp: ${new Date(item.expiryDate).toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' })}`}
                                                {((item.batchNo && shopSettings?.invBatchNumber !== false) || (item.expiryDate && shopSettings?.invExpiryDate !== false)) && item.serialNumber && ' | '}
                                                {item.serialNumber && `S/N: ${item.serialNumber}`}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ border: B, padding: '3px 2px', textAlign: 'center', fontSize: '10px' }}>{item.hsnCode || item.sacCode || ''}</td>
                                    <td style={{ border: B, padding: '3px 2px', textAlign: 'center', fontSize: '10px' }}>{item.quantity} {item.unit}</td>
                                    <td style={{ border: B, padding: '3px 2px', textAlign: 'center', fontSize: '10px' }}>{item.unit}</td>
                                    <td style={{ border: B, padding: '3px 2px', textAlign: 'right', fontSize: '10px' }}>{item.sellingPrice.toFixed(2)}</td>
                                    <td style={{ border: B, padding: '3px 2px', textAlign: 'center', fontSize: '10px' }}>
                                        {discountAmt > 0 ? discountAmt.toFixed(2) : ''}
                                    </td>
                                    <td style={{ border: B, padding: '3px 2px', textAlign: 'right', fontSize: '10px' }}>{taxableAmt.toFixed(2)}</td>
                                    {!isBOS && <td style={{ border: B, padding: '3px 2px', textAlign: 'center', fontSize: '10px' }}>{item.gstRate}%</td>}
                                    {!isBOS && <td style={{ border: B, padding: '3px 2px', textAlign: 'right', fontSize: '10px' }}>{taxAmt.toFixed(2)}</td>}
                                    <td style={{ border: B, padding: '3px 2px', textAlign: 'right', fontSize: '10px' }}>{item.totalAmount.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                        {/* Single consolidated tax rows — just above Total */}
                        {!isBOS && invoice.taxType === 'CGST_SGST' && (
                            <>
                                <tr>
                                    <td style={{ border: B, padding: '2px' }}></td>
                                    <td style={{ border: B, padding: '1px 4px', textAlign: 'right', fontStyle: 'italic', fontWeight: 'bold', fontSize: '10px' }}>CGST</td>
                                    <td style={{ border: B, padding: '2px' }}></td>
                                    <td style={{ border: B, padding: '2px' }}></td>
                                    <td style={{ border: B, padding: '2px' }}></td>
                                    <td style={{ border: B, padding: '2px' }}></td>
                                    <td style={{ border: B, padding: '2px' }}></td>
                                    <td style={{ border: B, padding: '2px' }}></td>
                                    <td style={{ border: B, padding: '2px' }}></td>
                                    <td style={{ border: B, padding: '1px 2px', textAlign: 'right', fontSize: '10px' }}>{(invoice.totalCGST || 0).toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: B, padding: '2px' }}></td>
                                    <td style={{ border: B, padding: '1px 4px', textAlign: 'right', fontStyle: 'italic', fontWeight: 'bold', fontSize: '10px' }}>SGST</td>
                                    <td style={{ border: B, padding: '2px' }}></td>
                                    <td style={{ border: B, padding: '2px' }}></td>
                                    <td style={{ border: B, padding: '2px' }}></td>
                                    <td style={{ border: B, padding: '2px' }}></td>
                                    <td style={{ border: B, padding: '2px' }}></td>
                                    <td style={{ border: B, padding: '2px' }}></td>
                                    <td style={{ border: B, padding: '2px' }}></td>
                                    <td style={{ border: B, padding: '1px 2px', textAlign: 'right', fontSize: '10px' }}>{(invoice.totalSGST || 0).toFixed(2)}</td>
                                </tr>
                            </>
                        )}
                        {!isBOS && invoice.taxType === 'IGST' && (
                            <tr>
                                <td style={{ border: B, padding: '2px' }}></td>
                                <td style={{ border: B, padding: '1px 4px', textAlign: 'right', fontStyle: 'italic', fontWeight: 'bold', fontSize: '10px' }}>IGST</td>
                                <td style={{ border: B, padding: '2px' }}></td>
                                <td style={{ border: B, padding: '2px' }}></td>
                                <td style={{ border: B, padding: '2px' }}></td>
                                <td style={{ border: B, padding: '2px' }}></td>
                                <td style={{ border: B, padding: '2px' }}></td>
                                <td style={{ border: B, padding: '2px' }}></td>
                                <td style={{ border: B, padding: '1px 2px', textAlign: 'right', fontSize: '10px' }}>{(invoice.totalIGST || 0).toFixed(2)}</td>
                            </tr>
                        )}
                        {/* Total row */}
                        <tr style={{ fontWeight: 'bold', backgroundColor: '#f8f8f8' }}>
                            <td colSpan={3} style={{ border: B, padding: '3px 4px', textAlign: 'right', fontSize: '10px' }}>Total</td>
                            <td style={{ border: B, padding: '3px 2px', textAlign: 'center', fontSize: '10px' }}>
                                {invoice.items.reduce((s, it) => s + it.quantity, 0)} {invoice.items[0]?.unit || ''}
                            </td>
                            {Array.from({ length: colCount - 5 }).map((_, i) => (
                                <td key={i} style={{ border: B, padding: '3px 2px' }}></td>
                            ))}
                            <td style={{ border: B, padding: '3px 2px', textAlign: 'right', fontSize: '10px' }}>
                                ₹ {invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── Amount Chargeable in Words ─────────────── */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: B, borderTop: 'none', padding: '2px 5px', fontSize: '9px', fontStyle: 'italic', width: '70%' }}>
                                Amount Chargeable (in words)
                            </td>
                            <td style={{ border: B, borderTop: 'none', padding: '2px 5px', fontSize: '9px', fontStyle: 'italic', textAlign: 'right' }}>
                                E. &amp; O.E
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2} style={{ border: B, borderTop: 'none', padding: '3px 5px', fontWeight: 'bold', fontSize: '11px' }}>
                                {rupeeWords(invoice.grandTotal)}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── HSN/SAC Tax Summary ────────────────────── */}
                {!isBOS && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f0f0f0' }}>
                                <th style={{ border: B, padding: '3px 4px', textAlign: 'center', fontSize: '10px' }} rowSpan={2}>HSN/SAC</th>
                                <th style={{ border: B, padding: '3px 4px', textAlign: 'right', fontSize: '10px' }} rowSpan={2}>Taxable<br />Value</th>
                                {invoice.taxType === 'CGST_SGST' ? (
                                    <>
                                        <th colSpan={2} style={{ border: B, padding: '3px 4px', textAlign: 'center', fontSize: '10px' }}>Central Tax</th>
                                        <th colSpan={2} style={{ border: B, padding: '3px 4px', textAlign: 'center', fontSize: '10px' }}>State Tax</th>
                                    </>
                                ) : (
                                    <th colSpan={2} style={{ border: B, padding: '3px 4px', textAlign: 'center', fontSize: '10px' }}>Integrated Tax</th>
                                )}
                                <th style={{ border: B, padding: '3px 4px', textAlign: 'right', fontSize: '10px' }} rowSpan={2}>Total<br />Tax Amt</th>
                            </tr>
                            <tr style={{ backgroundColor: '#f8f8f8' }}>
                                <th style={{ border: B, padding: '2px 4px', textAlign: 'center', fontSize: '9px' }}>Rate</th>
                                <th style={{ border: B, padding: '2px 4px', textAlign: 'right', fontSize: '9px' }}>Amount</th>
                                <th style={{ border: B, padding: '2px 4px', textAlign: 'center', fontSize: '9px' }}>Rate</th>
                                <th style={{ border: B, padding: '2px 4px', textAlign: 'right', fontSize: '9px' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hsnRows.map(([hsn, d]) => (
                                <tr key={hsn}>
                                    <td style={{ border: B, padding: '2px 4px', textAlign: 'center', fontSize: '10px' }}>{hsn}</td>
                                    <td style={{ border: B, padding: '2px 4px', textAlign: 'right', fontSize: '10px' }}>{d.taxableValue.toFixed(2)}</td>
                                    {invoice.taxType === 'CGST_SGST' ? (
                                        <>
                                            <td style={{ border: B, padding: '2px 4px', textAlign: 'center', fontSize: '10px' }}>{d.rate / 2}%</td>
                                            <td style={{ border: B, padding: '2px 4px', textAlign: 'right', fontSize: '10px' }}>{d.cgst.toFixed(2)}</td>
                                            <td style={{ border: B, padding: '2px 4px', textAlign: 'center', fontSize: '10px' }}>{d.rate / 2}%</td>
                                            <td style={{ border: B, padding: '2px 4px', textAlign: 'right', fontSize: '10px' }}>{d.sgst.toFixed(2)}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td style={{ border: B, padding: '2px 4px', textAlign: 'center', fontSize: '10px' }}>{d.rate}%</td>
                                            <td style={{ border: B, padding: '2px 4px', textAlign: 'right', fontSize: '10px' }}>{d.igst.toFixed(2)}</td>
                                        </>
                                    )}
                                    <td style={{ border: B, padding: '2px 4px', textAlign: 'right', fontSize: '10px' }}>
                                        {invoice.taxType === 'CGST_SGST' ? (d.cgst + d.sgst).toFixed(2) : d.igst.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                                <td style={{ border: B, padding: '2px 4px', textAlign: 'right', fontSize: '10px' }}>Total</td>
                                <td style={{ border: B, padding: '2px 4px', textAlign: 'right', fontSize: '10px' }}>
                                    {hsnRows.reduce((s, [, d]) => s + d.taxableValue, 0).toFixed(2)}
                                </td>
                                {invoice.taxType === 'CGST_SGST' ? (
                                    <>
                                        <td style={{ border: B, padding: '2px 4px' }}></td>
                                        <td style={{ border: B, padding: '2px 4px', textAlign: 'right', fontSize: '10px' }}>{hsnRows.reduce((s, [, d]) => s + d.cgst, 0).toFixed(2)}</td>
                                        <td style={{ border: B, padding: '2px 4px' }}></td>
                                        <td style={{ border: B, padding: '2px 4px', textAlign: 'right', fontSize: '10px' }}>{hsnRows.reduce((s, [, d]) => s + d.sgst, 0).toFixed(2)}</td>
                                    </>
                                ) : (
                                    <>
                                        <td style={{ border: B, padding: '2px 4px' }}></td>
                                        <td style={{ border: B, padding: '2px 4px', textAlign: 'right', fontSize: '10px' }}>{hsnRows.reduce((s, [, d]) => s + d.igst, 0).toFixed(2)}</td>
                                    </>
                                )}
                                <td style={{ border: B, padding: '2px 4px', textAlign: 'right', fontSize: '10px' }}>{totalTaxAmt.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                )}

                {/* ── Tax Amount in Words ────────────────────── */}
                {!isBOS && (
                    <div style={{ border: B, borderTop: 'none', padding: '3px 5px', fontSize: '10px', marginBottom: '4px' }}>
                        <strong>Tax Amount (In words) : </strong>{rupeeWords(totalTaxAmt)}
                    </div>
                )}

                {/* ── Bank Details ───────────────────────────── */}
                {(hasBankDetails || shopSettings?.invQrCode) && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
                        <tbody>
                            <tr>
                                <td style={{ border: B, padding: '5px', fontSize: '10px', width: shopSettings?.invQrCode ? '40%' : '55%', verticalAlign: 'top' }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Bank Details:</div>
                                    {shopSettings.invAccountHolder && <div>A/C Holder: {shopSettings.invAccountHolder}</div>}
                                    {shopSettings.invBankName && <div>Bank: {shopSettings.invBankName}</div>}
                                    {shopSettings.invAccountNumber && <div>A/C No: {shopSettings.invAccountNumber}</div>}
                                    {shopSettings.invIfscCode && <div>IFSC: {shopSettings.invIfscCode}</div>}
                                    {shopSettings.invBranchName && <div>Branch: {shopSettings.invBranchName}</div>}
                                </td>
                                {shopSettings?.invQrCode ? (
                                    <td style={{ border: B, padding: '5px', fontSize: '10px', verticalAlign: 'top', textAlign: 'center', width: '20%' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '3px', fontSize: '9px' }}>QR Code</div>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={shopSettings.invQrCode} alt="QR Code" style={{ width: '80px', height: '80px', objectFit: 'contain', border: '1px solid #ddd' }} />
                                    </td>
                                ) : null}
                                <td style={{ border: B, padding: '5px', fontSize: '10px', verticalAlign: 'top', width: shopSettings?.invQrCode ? '40%' : '45%' }}>
                                    {invoice.notes ? <><strong>Notes: </strong>{invoice.notes}</> : <>&nbsp;</>}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                )}

                {/* ── Transport / Dispatch Details ─────────────── */}
                {(invoice.transportMode || invoice.transporterName || invoice.vehicleNumber ||
                  invoice.approxDist || invoice.pos || invoice.supplyDate || invoice.transporterId ||
                  invoice.eWayBillNumber) && (
                    <div style={{ border: B, borderTop: 'none', padding: '4px 6px', fontSize: '10px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold' }}>Transport Details: </span>
                        {invoice.eWayBillNumber && <span style={{ marginRight: '12px' }}>E-Way Bill No.: <strong>{invoice.eWayBillNumber}</strong></span>}
                        {invoice.transportMode && <span style={{ marginRight: '12px' }}>Mode: {invoice.transportMode}</span>}
                        {invoice.transporterName && <span style={{ marginRight: '12px' }}>Transporter: {invoice.transporterName}</span>}
                        {invoice.transporterId && <span style={{ marginRight: '12px' }}>Transporter ID: {invoice.transporterId}</span>}
                        {invoice.vehicleNumber && <span style={{ marginRight: '12px' }}>Vehicle No.: {invoice.vehicleNumber}</span>}
                        {invoice.approxDist && <span style={{ marginRight: '12px' }}>Distance: {invoice.approxDist} km</span>}
                        {invoice.pos && <span style={{ marginRight: '12px' }}>Place of Supply: {invoice.pos}</span>}
                        {invoice.supplyDate && <span>Supply Date: {new Date(invoice.supplyDate).toLocaleDateString('en-IN')}</span>}
                    </div>
                )}

                {/* ── Terms & Conditions ─────────────────────── */}
                {hasTerms && (
                    <div style={{ border: B, padding: '3px 5px', marginBottom: '4px', fontSize: '9px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Terms &amp; Conditions: </div>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                            {shopSettings.invoiceTerms || shopSettings.termsAndConditions}
                        </div>
                    </div>
                )}

                {/* ── Declaration + Authorised Signatory ─────── */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: B, padding: '5px', width: '55%', verticalAlign: 'top', fontSize: '10px' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Declaration</div>
                                <div style={{ fontSize: '9px', color: '#333', lineHeight: '1.4' }}>
                                    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                                </div>
                            </td>
                            <td style={{ border: B, padding: '5px', width: '45%', textAlign: 'right', verticalAlign: 'top', fontSize: '10px' }}>
                                <div>for <strong>{shopSettings?.shopName || ''}</strong></div>
                                <div style={{ height: '32px' }}></div>
                                <div style={{ borderTop: '1px solid #bbb', paddingTop: '2px' }}>Authorised Signatory</div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── Footer ────────────────────────────────── */}
                <div style={{ textAlign: 'center', padding: '4px 0', fontSize: '10px', fontStyle: 'italic' }}>
                    This is a Computer Generated Invoice
                </div>
            </div>
        </>
    );
}
