'use client';
// GST Reports Page
import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { HiDownload, HiDocumentReport } from 'react-icons/hi';
import { reportsAPI } from '@/utils/api';
import { useShopStore } from '@/store/useShopStore';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

export default function ReportsPage() {
  const toast = useToast();
  const { shopSettings, fetchShopSettings } = useShopStore();
  const shopName = shopSettings?.shopName || 'Billing Software';
  const [activeTab, setActiveTab] = useState('gstr1');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchShopSettings();
  }, []);

  const tabs = [
    { id: 'gstr1', name: 'GSTR-1', description: 'Outward Supplies' },
    { id: 'gstr3b', name: 'GSTR-3B', description: 'Summary Return' },
    { id: 'taxSummary', name: 'Tax Summary', description: 'GST Breakdown' },
    { id: 'hsnSummary', name: 'HSN Summary', description: 'HSN-wise Summary' }
  ];

  const generateReport = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast.warning('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setReportData(null);

    try {
      let data;
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };

      switch (activeTab) {
        case 'gstr1':
          // Fetch both invoices and credit notes for GSTR-1
          const [gstr1Data, creditNotes] = await Promise.all([
            reportsAPI.getGSTR1(params),
            reportsAPI.getCreditNotes(params)
          ]);
          data = {
            ...gstr1Data,
            creditNotes: creditNotes || []
          };
          break;
        case 'gstr3b':
          data = await reportsAPI.getGSTR3B(params);
          break;
        case 'taxSummary':
          data = await reportsAPI.getTaxSummary(params);
          break;
        case 'hsnSummary':
          data = await reportsAPI.getHSNSummary(params);
          break;
      }

      setReportData(data);

      // Debug: Log the full report data structure
      console.log('📊 Full Report Data:', data);
      console.log('📈 Summary:', data.summary);
      console.log('📋 GST Rate Totals:', data.gstRateTotals);
      console.log('📦 B2B Invoices Count:', data.b2bInvoices?.length);
      console.log('📦 B2C Large Count:', data.b2cLarge?.length);
      console.log('📦 B2C Small Count:', data.b2cSmall?.length);
      console.log('📝 Credit Notes Count:', data.creditNotes?.length);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    if (!reportData) {
      toast.warning('Please generate a report first');
      return;
    }

    if (format === 'pdf') {
      toast.info('Tip: Turn OFF "Headers and footers" in print dialog for a clean PDF', 8000);
      window.print();
      return;
    }

    if (format === 'excel') {
      exportToExcel();
    }

    if (format === 'json') {
      exportToJSON();
    }
  };

  const exportToJSON = () => {
    // Validation: Check if report data exists
    if (!reportData) {
      toast.error('Please generate a report first');
      return;
    }

    // Validation: Check if shop GSTIN is configured
    if (!shopSettings?.gstin) {
      toast.error('GSTIN not configured. Please update shop settings before exporting.');
      return;
    }

    const reportName = tabs.find(t => t.id === activeTab)?.name || 'Report';
    const dateStr = `${dateRange.startDate}_to_${dateRange.endDate}`;

    let jsonData;

    // Generate GST Portal compliant JSON for GSTR-1
    if (activeTab === 'gstr1') {
      jsonData = transformToGSTR1Format(reportData, shopSettings, dateRange);
    } else {
      // For other reports, use generic format
      jsonData = {
        reportType: reportName,
        reportId: activeTab,
        generatedAt: new Date().toISOString(),
        period: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        },
        data: reportData
      };
    }

    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportName}_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${reportName} JSON exported successfully!`);
  };

  // Transform data to GST Portal GSTR-1 format
  const transformToGSTR1Format = (data, shop, dateRange) => {
    // Helper: Format date to DD-MM-YYYY
    const formatGSTDate = (dateStr) => {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    // Helper: Get financial period (MMYYYY format)
    const getFinancialPeriod = (dateStr) => {
      const date = new Date(dateStr);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}${year}`;
    };

    // Helper: Get state code from place of supply
    const getStateCode = (placeOfSupply) => {
      if (!placeOfSupply) return shop.stateCode || "29"; // Default to Karnataka

      // State name to code mapping
      const stateCodeMap = {
        'JAMMU AND KASHMIR': '01',
        'HIMACHAL PRADESH': '02',
        'PUNJAB': '03',
        'CHANDIGARH': '04',
        'UTTARAKHAND': '05',
        'HARYANA': '06',
        'DELHI': '07',
        'RAJASTHAN': '08',
        'UTTAR PRADESH': '09',
        'BIHAR': '10',
        'SIKKIM': '11',
        'ARUNACHAL PRADESH': '12',
        'NAGALAND': '13',
        'MANIPUR': '14',
        'MIZORAM': '15',
        'TRIPURA': '16',
        'MEGHALAYA': '17',
        'ASSAM': '18',
        'WEST BENGAL': '19',
        'JHARKHAND': '20',
        'ODISHA': '21',
        'CHATTISGARH': '22',
        'MADHYA PRADESH': '23',
        'GUJARAT': '24',
        'DAMAN AND DIU': '25',
        'DADRA AND NAGAR HAVELI': '26',
        'MAHARASHTRA': '27',
        'ANDHRA PRADESH': '28',
        'KARNATAKA': '29',
        'GOA': '30',
        'LAKSHADWEEP': '31',
        'KERALA': '32',
        'TAMIL NADU': '33',
        'PUDUCHERRY': '34',
        'ANDAMAN AND NICOBAR ISLANDS': '35',
        'TELANGANA': '36',
        'ANDHRA PRADESH (NEW)': '37',
        'LADAKH': '38'
      };

      // Extract numeric code if format is "29-Karnataka" or "29"
      const numericMatch = placeOfSupply.match(/^(\d+)/);
      if (numericMatch) {
        return numericMatch[1].padStart(2, '0');
      }

      // Try to match state name (case-insensitive)
      const stateName = placeOfSupply.toUpperCase().trim();
      if (stateCodeMap[stateName]) {
        return stateCodeMap[stateName];
      }

      // If no match found, return default or original value
      console.warn(`Unknown state: ${placeOfSupply}, using default state code`);
      return shop.stateCode || "29";
    };

    // Helper to extract numeric part from invoice number
    const getNumericInvoiceNumber = (invoiceNum) => {
      if (!invoiceNum) return '';
      // Extract last numeric part (e.g., "INV-2025-DI-000001" -> "01")
      const match = invoiceNum.match(/(\d+)$/);
      if (match) {
        // Remove leading zeros and return
        return String(parseInt(match[1], 10)).padStart(2, '0');
      }
      return invoiceNum;
    };

    // Initialize GST Portal structure with mandatory fields
    const gstr1 = {
      gstin: shop.gstin,
      fp: getFinancialPeriod(dateRange.endDate)
      // Removed gt and cur_gt as per GST Portal requirements
    };

    // Transform B2B Invoices (Business to Business)
    const b2bData = [];
    const b2bByGstin = {};

    (data.b2bInvoices || []).forEach(inv => {
      // Skip if missing critical data
      if (!inv.gstin || !inv.invoiceNumber || !inv.invoiceDate) {
        console.warn(`Skipping B2B invoice ${inv.invoiceNumber || 'Unknown'}: Missing required fields`);
        return;
      }

      // Skip placeholder/test invoices
      if (inv.invoiceNumber.toUpperCase().includes('TEST') ||
        inv.invoiceNumber.toUpperCase().includes('DRAFT')) {
        console.warn(`Skipping placeholder invoice: ${inv.invoiceNumber}`);
        return;
      }

      // Group by GSTIN
      if (!b2bByGstin[inv.gstin]) {
        b2bByGstin[inv.gstin] = [];
      }

      // Transform invoice
      const gstInvoice = {
        inum: getNumericInvoiceNumber(inv.invoiceNumber),
        idt: formatGSTDate(inv.invoiceDate),
        val: parseFloat((inv.invoiceValue || 0).toFixed(2)),
        pos: getStateCode(inv.placeOfSupply),
        rchrg: "N", // Reverse charge - default No
        inv_typ: "R", // Regular invoice
        itms: []
      };

      // Transform items
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach((item, idx) => {
          gstInvoice.itms.push({
            num: idx + 1,
            itm_det: {
              txval: parseFloat((item.taxableAmount || item.taxableValue || 0).toFixed(2)),
              rt: parseFloat(item.gstRate || 0),
              iamt: parseFloat((item.igst || 0).toFixed(2)),
              camt: parseFloat((item.cgst || 0).toFixed(2)),
              samt: parseFloat((item.sgst || 0).toFixed(2)),
              csamt: parseFloat((item.cessAmount || 0).toFixed(2))
            }
          });
        });
      } else {
        // If no items, create single item from invoice totals
        gstInvoice.itms.push({
          num: 1,
          itm_det: {
            txval: parseFloat((inv.taxableValue || 0).toFixed(2)),
            rt: parseFloat(inv.gstRate || 0),
            iamt: parseFloat((inv.igst || 0).toFixed(2)),
            camt: parseFloat((inv.cgst || 0).toFixed(2)),
            samt: parseFloat((inv.sgst || 0).toFixed(2)),
            csamt: parseFloat((inv.cessAmount || 0).toFixed(2))
          }
        });
      }

      b2bByGstin[inv.gstin].push(gstInvoice);
    });

    // Convert grouped B2B data to array format
    Object.entries(b2bByGstin).forEach(([gstin, invoices]) => {
      b2bData.push({
        ctin: gstin,
        inv: invoices
      });
    });

    // Only add b2b section if it has data
    if (b2bData.length > 0) {
      gstr1.b2b = b2bData;
    }

    // Transform B2CL (B2C Large - invoices > 2.5 lakhs)
    const b2clData = [];
    (data.b2cLarge || []).forEach(inv => {
      if (!inv.invoiceNumber || !inv.invoiceDate) {
        console.warn(`Skipping B2CL invoice: Missing required fields`);
        return;
      }

      b2clData.push({
        pos: getStateCode(inv.placeOfSupply),
        inv: [{
          inum: getNumericInvoiceNumber(inv.invoiceNumber),
          idt: formatGSTDate(inv.invoiceDate),
          val: parseFloat((inv.invoiceValue || 0).toFixed(2)),
          itms: [{
            num: 1,
            itm_det: {
              txval: parseFloat((inv.taxableValue || 0).toFixed(2)),
              rt: parseFloat(inv.gstRate || 0),
              iamt: parseFloat((inv.igst || 0).toFixed(2)),
              camt: parseFloat((inv.cgst || 0).toFixed(2)),
              samt: parseFloat((inv.sgst || 0).toFixed(2)),
              csamt: parseFloat((inv.cessAmount || 0).toFixed(2))
            }
          }]
        }]
      });
    });

    // Only add b2cl section if it has data
    if (b2clData.length > 0) {
      gstr1.b2cl = b2clData;
    }

    // Transform B2CS (B2C Small - invoices <= 2.5 lakhs)
    const b2csData = [];
    const b2csByRateAndState = {};

    (data.b2cSmall || []).forEach(inv => {
      const key = `${inv.gstRate || 0}_${getStateCode(inv.placeOfSupply)}`;

      if (!b2csByRateAndState[key]) {
        b2csByRateAndState[key] = {
          sply_ty: "INTRA", // Intra-state supply (can be INTER for interstate)
          pos: getStateCode(inv.placeOfSupply),
          typ: "OE", // Other than exports
          txval: 0,
          rt: parseFloat(inv.gstRate || 0),
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0
        };
      }

      b2csByRateAndState[key].txval += parseFloat(inv.taxableValue || 0);
      b2csByRateAndState[key].iamt += parseFloat(inv.igst || 0);
      b2csByRateAndState[key].camt += parseFloat(inv.cgst || 0);
      b2csByRateAndState[key].samt += parseFloat(inv.sgst || 0);
      b2csByRateAndState[key].csamt += parseFloat(inv.cessAmount || 0);
    });

    // Convert to array and round values
    Object.values(b2csByRateAndState).forEach(item => {
      b2csData.push({
        ...item,
        txval: parseFloat(item.txval.toFixed(2)),
        iamt: parseFloat(item.iamt.toFixed(2)),
        camt: parseFloat(item.camt.toFixed(2)),
        samt: parseFloat(item.samt.toFixed(2)),
        csamt: parseFloat(item.csamt.toFixed(2))
      });
    });

    // Only add b2cs section if it has data
    if (b2csData.length > 0) {
      gstr1.b2cs = b2csData;
    }

    // HSN Summary
    const hsnData = {};
    const allInvoices = [
      ...(data.b2bInvoices || []),
      ...(data.b2cLarge || []),
      ...(data.b2cSmall || [])
    ];

    allInvoices.forEach(inv => {
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach(item => {
          const hsn = item.hsnCode || item.hsn || 'N/A';

          // Skip if no valid HSN code
          if (hsn === 'N/A' || !hsn) return;

          if (!hsnData[hsn]) {
            hsnData[hsn] = {
              num: 1,
              hsn_sc: hsn,
              desc: item.productName || item.description || '',
              uqc: item.unit || item.uqc || 'PCS',
              qty: 0,
              val: 0,
              txval: 0,
              iamt: 0,
              camt: 0,
              samt: 0,
              csamt: 0,
              rt: parseFloat(item.gstRate || 0)
            };
          }

          hsnData[hsn].qty += parseFloat(item.quantity || 0);
          hsnData[hsn].val += parseFloat(item.totalAmount || 0);
          hsnData[hsn].txval += parseFloat(item.taxableAmount || item.taxableValue || 0);
          hsnData[hsn].iamt += parseFloat(item.igst || 0);
          hsnData[hsn].camt += parseFloat(item.cgst || 0);
          hsnData[hsn].samt += parseFloat(item.sgst || 0);
          hsnData[hsn].csamt += parseFloat(item.cessAmount || 0);
        });
      }
    });

    // Convert HSN data to array and round values
    const hsnArray = Object.values(hsnData).map((item, idx) => ({
      ...item,
      num: idx + 1,
      qty: parseFloat(item.qty.toFixed(2)),
      val: parseFloat(item.val.toFixed(2)),
      txval: parseFloat(item.txval.toFixed(2)),
      iamt: parseFloat(item.iamt.toFixed(2)),
      camt: parseFloat(item.camt.toFixed(2)),
      samt: parseFloat(item.samt.toFixed(2)),
      csamt: parseFloat(item.csamt.toFixed(2))
    }));

    // Separate HSN data into B2B and B2C
    const hsnB2B = [];
    const hsnB2C = [];

    // Group by invoice type
    const b2bInvoiceNumbers = new Set((data.b2bInvoices || []).map(inv => inv.invoiceNumber));

    allInvoices.forEach(inv => {
      const isB2B = b2bInvoiceNumbers.has(inv.invoiceNumber);

      if (inv.items && inv.items.length > 0) {
        inv.items.forEach(item => {
          const hsn = item.hsnCode || item.hsn || 'N/A';
          if (hsn === 'N/A' || !hsn) return;

          const targetArray = isB2B ? hsnB2B : hsnB2C;
          let hsnEntry = targetArray.find(h => h.hsn_sc === hsn && h.rt === parseFloat(item.gstRate || 0));

          if (!hsnEntry) {
            hsnEntry = {
              num: targetArray.length + 1,
              hsn_sc: hsn,
              txval: 0,
              rt: parseFloat(item.gstRate || 0),
              iamt: 0,
              camt: 0,
              samt: 0,
              csamt: 0,
              uqc: item.unit || item.uqc || 'PCS',
              qty: 0
            };
            targetArray.push(hsnEntry);
          }

          hsnEntry.qty += parseFloat(item.quantity || 0);
          hsnEntry.txval += parseFloat(item.taxableAmount || item.taxableValue || 0);
          hsnEntry.iamt += parseFloat(item.igst || 0);
          hsnEntry.camt += parseFloat(item.cgst || 0);
          hsnEntry.samt += parseFloat(item.sgst || 0);
          hsnEntry.csamt += parseFloat(item.cessAmount || 0);
        });
      }
    });

    // Round values and renumber
    const roundHsnValues = (arr) => arr.map((item, idx) => ({
      num: idx + 1,
      hsn_sc: item.hsn_sc,
      txval: parseFloat(item.txval.toFixed(2)),
      rt: item.rt,
      iamt: parseFloat(item.iamt.toFixed(2)),
      camt: parseFloat(item.camt.toFixed(2)),
      samt: parseFloat(item.samt.toFixed(2)),
      csamt: parseFloat(item.csamt.toFixed(2)),
      uqc: item.uqc,
      qty: parseFloat(item.qty.toFixed(0))
    }));

    // Only add hsn section if it has data
    if (hsnB2B.length > 0 || hsnB2C.length > 0) {
      gstr1.hsn = {};
      if (hsnB2B.length > 0) gstr1.hsn.hsn_b2b = roundHsnValues(hsnB2B);
      if (hsnB2C.length > 0) gstr1.hsn.hsn_b2c = roundHsnValues(hsnB2C);
    }

    // CDNR - Credit/Debit Notes (Registered - B2B)
    const cdnrData = [];
    const cdnrByGstin = {};

    (data.creditNotes || []).forEach(note => {
      // Only include if customer has GSTIN (B2B)
      if (!note.customerGstin || note.customerGstin.trim() === '') return;

      // Skip if missing critical data
      if (!note.creditNoteNumber || !note.returnDate) {
        console.warn(`Skipping credit note: Missing required fields`);
        return;
      }

      // Group by customer GSTIN
      if (!cdnrByGstin[note.customerGstin]) {
        cdnrByGstin[note.customerGstin] = [];
      }

      cdnrByGstin[note.customerGstin].push({
        val: parseFloat((note.grandTotal || 0).toFixed(2)),
        ntty: "C", // C for Credit Note, D for Debit Note
        nt_num: getNumericInvoiceNumber(note.creditNoteNumber),
        nt_dt: formatGSTDate(note.returnDate),
        pos: getStateCode(note.placeOfSupply || shop.state),
        rchrg: "N", // Reverse charge
        inv_typ: "R", // Regular invoice type
        itms: note.items ? note.items.map((item, idx) => ({
          num: idx + 1,
          itm_det: {
            txval: parseFloat((item.taxableAmount || 0).toFixed(2)),
            rt: parseFloat(item.gstRate || 0),
            iamt: parseFloat((item.igst || 0).toFixed(2)),
            camt: parseFloat((item.cgst || 0).toFixed(2)),
            samt: parseFloat((item.sgst || 0).toFixed(2)),
            csamt: parseFloat((item.cessAmount || 0).toFixed(2))
          }
        })) : [{
          num: 1,
          itm_det: {
            txval: parseFloat((note.subtotal || 0).toFixed(2)),
            rt: parseFloat(note.gstRate || 0),
            iamt: parseFloat((note.totalIGST || 0).toFixed(2)),
            camt: parseFloat((note.totalCGST || 0).toFixed(2)),
            samt: parseFloat((note.totalSGST || 0).toFixed(2)),
            csamt: 0
          }
        }]
      });
    });

    // Convert grouped CDNR data to array format
    Object.entries(cdnrByGstin).forEach(([gstin, notes]) => {
      cdnrData.push({
        ctin: gstin,
        nt: notes
      });
    });

    // Only add cdnr section if it has data
    if (cdnrData.length > 0) {
      gstr1.cdnr = cdnrData;
    }

    // CDNUR - Credit/Debit Notes (Unregistered - B2C)
    const cdnurData = [];

    (data.creditNotes || []).forEach(note => {
      // Only include if customer has NO GSTIN (B2C)
      if (note.customerGstin && note.customerGstin.trim() !== '') return;

      // Skip if missing critical data
      if (!note.creditNoteNumber || !note.returnDate) {
        console.warn(`Skipping B2C credit note: Missing required fields`);
        return;
      }

      cdnurData.push({
        val: parseFloat((note.grandTotal || 0).toFixed(2)),
        ntty: "C", // C for Credit Note
        nt_num: getNumericInvoiceNumber(note.creditNoteNumber),
        nt_dt: formatGSTDate(note.returnDate),
        pos: getStateCode(note.placeOfSupply || shop.state),
        rchrg: "N", // Reverse charge
        inv_typ: "R", // Regular invoice type
        itms: note.items ? note.items.map((item, idx) => ({
          num: idx + 1,
          itm_det: {
            txval: parseFloat((item.taxableAmount || 0).toFixed(2)),
            rt: parseFloat(item.gstRate || 0),
            iamt: parseFloat((item.igst || 0).toFixed(2)),
            camt: parseFloat((item.cgst || 0).toFixed(2)),
            samt: parseFloat((item.sgst || 0).toFixed(2)),
            csamt: parseFloat((item.cessAmount || 0).toFixed(2))
          }
        })) : [{
          num: 1,
          itm_det: {
            txval: parseFloat((note.subtotal || 0).toFixed(2)),
            rt: parseFloat(note.gstRate || 0),
            iamt: parseFloat((note.totalIGST || 0).toFixed(2)),
            camt: parseFloat((note.totalCGST || 0).toFixed(2)),
            samt: parseFloat((note.totalSGST || 0).toFixed(2)),
            csamt: 0
          }
        }]
      });
    });

    // Only add cdnur section if it has data
    if (cdnurData.length > 0) {
      gstr1.cdnur = cdnurData;
    }

    // NIL - Nil Rated, Exempted and Non-GST Supplies
    const nilSupplies = {
      inv: [
        { sply_ty: "INTRAB2B", nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
        { sply_ty: "INTRAB2C", nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
        { sply_ty: "INTRB2B", nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
        { sply_ty: "INTRB2C", nil_amt: 0, expt_amt: 0, ngsup_amt: 0 }
      ]
    };

    // Calculate nil-rated supplies (0% GST)
    allInvoices.forEach(inv => {
      const isNilRated = inv.items ?
        inv.items.some(item => (item.gstRate || 0) === 0) :
        (inv.gstRate || 0) === 0 || (inv.totalTax || 0) === 0;

      if (isNilRated) {
        const hasGstin = inv.gstin || inv.customerGstin;
        const isInterState = inv.taxType === 'IGST' || (inv.totalIGST || 0) > 0;

        let supplyType;
        if (isInterState && hasGstin) supplyType = "INTRB2B";
        else if (isInterState && !hasGstin) supplyType = "INTRB2C";
        else if (!isInterState && hasGstin) supplyType = "INTRAB2B";
        else supplyType = "INTRAB2C";

        const supplyIndex = nilSupplies.inv.findIndex(s => s.sply_ty === supplyType);
        if (supplyIndex !== -1) {
          nilSupplies.inv[supplyIndex].nil_amt += parseFloat(inv.grandTotal || inv.invoiceValue || 0);
        }
      }
    });

    // Round nil amounts
    nilSupplies.inv = nilSupplies.inv.map(item => ({
      ...item,
      nil_amt: parseFloat(item.nil_amt.toFixed(2)),
      expt_amt: parseFloat(item.expt_amt.toFixed(2)),
      ngsup_amt: parseFloat(item.ngsup_amt.toFixed(2))
    }));

    // Only add nil section if there are nil-rated supplies
    const hasNilSupplies = nilSupplies.inv.some(item => item.nil_amt > 0 || item.expt_amt > 0 || item.ngsup_amt > 0);
    if (hasNilSupplies) {
      gstr1.nil = nilSupplies;
    }

    // DOC_ISSUE - Documents Issued
    const invoiceNumbers = allInvoices.map(inv => inv.invoiceNumber).filter(Boolean).sort();
    const creditNoteNumbers = (data.creditNotes || []).map(note => note.creditNoteNumber).filter(Boolean).sort();

    const docIssue = {
      doc_det: []
    };

    // Invoices
    if (invoiceNumbers.length > 0) {
      docIssue.doc_det.push({
        doc_num: 1,
        docs: [{
          num: 1,
          from: getNumericInvoiceNumber(invoiceNumbers[0]),
          to: getNumericInvoiceNumber(invoiceNumbers[invoiceNumbers.length - 1]),
          totnum: invoiceNumbers.length,
          cancel: 0,
          net_issue: invoiceNumbers.length
        }]
      });
    }

    // Credit Notes
    if (creditNoteNumbers.length > 0) {
      docIssue.doc_det.push({
        doc_num: 2,
        docs: [{
          num: 1,
          from: getNumericInvoiceNumber(creditNoteNumbers[0]),
          to: getNumericInvoiceNumber(creditNoteNumbers[creditNoteNumbers.length - 1]),
          totnum: creditNoteNumbers.length,
          cancel: 0,
          net_issue: creditNoteNumbers.length
        }]
      });
    }

    // Only add doc_issue section if there are documents
    if (docIssue.doc_det.length > 0) {
      gstr1.doc_issue = docIssue;
    }

    return gstr1;
  };

  const exportToExcel = async () => {
    const reportName = tabs.find(t => t.id === activeTab)?.name || 'Report';
    const dateStr = `${dateRange.startDate}_to_${dateRange.endDate}`;

    if (activeTab === 'gstr1') {
      // Create a new workbook using ExcelJS
      const workbook = new ExcelJS.Workbook();

      // Helper function to format dates
      const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      };

      // Helper function to apply styles
      const applyHeaderStyle = (cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFFFF' },
          size: 11
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      };

      const applyTitleStyle = (cell) => {
        cell.font = {
          bold: true,
          size: 12,
          color: { argb: 'FF1F4E78' }
        };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      };

      const applySummaryStyle = (cell) => {
        cell.font = { bold: true, size: 10 };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      };

      const applyDataStyle = (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
        };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      };

      // Combine all invoices for reference
      const allInvoices = [
        ...(reportData.b2bInvoices || []),
        ...(reportData.b2cLarge || []),
        ...(reportData.b2cSmall || [])
      ];

      // ==================== SHEET 1: B2B (4A, 4B, 6B, 6C) ====================
      const b2bSheet = workbook.addWorksheet('b2b');
      const b2bInvoices = reportData.b2bInvoices || [];
      const uniqueRecipients = new Set(b2bInvoices.map(inv => inv.gstin)).size;
      const b2bTotalInvoiceValue = b2bInvoices.reduce((sum, inv) => sum + (inv.invoiceValue || 0), 0);

      // Add title
      b2bSheet.addRow(['Summary For B2B, SEZ, DE (4A, 4B, 6B, 6C)']);
      applyTitleStyle(b2bSheet.getCell('A1'));

      // Add summary
      b2bSheet.addRow(['No. of Recipients', '', 'No. of Invoices', '', 'Total Invoice Value']);
      b2bSheet.getRow(2).eachCell((cell) => applySummaryStyle(cell));
      b2bSheet.addRow([uniqueRecipients, '', b2bInvoices.length, '', b2bTotalInvoiceValue.toFixed(2)]);

      // Empty row
      b2bSheet.addRow([]);

      // Add header
      const b2bHeaders = ['GSTIN/UIN of Recipient', 'Receiver Name', 'Invoice Number', 'Invoice date', 'Invoice Value', 'Place Of Supply', 'Reverse Charge', 'Applicable % of Tax Rate', 'Invoice Type'];
      b2bSheet.addRow(b2bHeaders);
      b2bSheet.getRow(5).eachCell((cell) => applyHeaderStyle(cell));

      // Add data
      b2bInvoices.forEach(inv => {
        const row = b2bSheet.addRow([
          inv.gstin || '',
          inv.customerName || '',
          inv.invoiceNumber || '',
          formatDate(inv.invoiceDate),
          (inv.invoiceValue || 0).toFixed(2),
          inv.placeOfSupply || '',
          'N',
          '',
          'Regular'
        ]);
        row.eachCell((cell) => applyDataStyle(cell));
      });

      // Set column widths
      b2bSheet.columns = b2bHeaders.map(() => ({ width: 18 }));

      // ==================== SHEET 2: B2CL (5A, 5B) ====================
      const b2clSheet = workbook.addWorksheet('b2cl');
      const b2clInvoices = reportData.b2cLarge || [];
      const b2clTotalInvoiceValue = b2clInvoices.reduce((sum, inv) => sum + (inv.invoiceValue || 0), 0);

      b2clSheet.addRow(['Summary For B2CL (5A, 5B)']);
      applyTitleStyle(b2clSheet.getCell('A1'));

      b2clSheet.addRow(['No. of Invoices', '', 'Total Invoice Value']);
      b2clSheet.getRow(2).eachCell((cell) => applySummaryStyle(cell));
      b2clSheet.addRow([b2clInvoices.length, '', b2clTotalInvoiceValue.toFixed(2)]);

      b2clSheet.addRow([]);

      const b2clHeaders = ['Invoice Number', 'Invoice date', 'Invoice Value', 'Place Of Supply', 'Applicable % of Tax Rate', 'Rate', 'Taxable Value', 'Cess Amount', 'E-Commerce GSTIN'];
      b2clSheet.addRow(b2clHeaders);
      b2clSheet.getRow(5).eachCell((cell) => applyHeaderStyle(cell));

      b2clInvoices.forEach(inv => {
        const row = b2clSheet.addRow([
          inv.invoiceNumber || '',
          formatDate(inv.invoiceDate),
          (inv.invoiceValue || 0).toFixed(2),
          inv.placeOfSupply || '',
          '',
          inv.gstRate || 0,
          (inv.taxableValue || 0).toFixed(2),
          (inv.cessAmount || 0).toFixed(2),
          ''
        ]);
        row.eachCell((cell) => applyDataStyle(cell));
      });

      b2clSheet.columns = b2clHeaders.map(() => ({ width: 18 }));

      // ==================== SHEET 3: B2CS (7) ====================
      const b2csSheet = workbook.addWorksheet('b2cs');
      const b2csInvoices = reportData.b2cSmall || [];

      const b2csGrouped = {};
      b2csInvoices.forEach(inv => {
        const key = `${inv.gstRate || 0}_${inv.placeOfSupply || ''}`;
        if (!b2csGrouped[key]) {
          b2csGrouped[key] = {
            rate: inv.gstRate || 0,
            placeOfSupply: inv.placeOfSupply || '',
            taxableValue: 0,
            cessAmount: 0
          };
        }
        b2csGrouped[key].taxableValue += inv.taxableValue || 0;
        b2csGrouped[key].cessAmount += inv.cessAmount || 0;
      });

      const b2csTotalTaxable = Object.values(b2csGrouped).reduce((sum, item) => sum + item.taxableValue, 0);
      const b2csTotalCess = Object.values(b2csGrouped).reduce((sum, item) => sum + item.cessAmount, 0);

      b2csSheet.addRow(['Summary For B2CS (7)']);
      applyTitleStyle(b2csSheet.getCell('A1'));

      b2csSheet.addRow(['Total Taxable Value', '', 'Total Cess']);
      b2csSheet.getRow(2).eachCell((cell) => applySummaryStyle(cell));
      b2csSheet.addRow([b2csTotalTaxable.toFixed(2), '', b2csTotalCess.toFixed(2)]);

      b2csSheet.addRow([]);

      const b2csHeaders = ['Type', 'Place Of Supply', 'Applicable % of Tax Rate', 'Rate', 'Taxable Value', 'Cess Amount', 'E-Commerce GSTIN'];
      b2csSheet.addRow(b2csHeaders);
      b2csSheet.getRow(5).eachCell((cell) => applyHeaderStyle(cell));

      Object.values(b2csGrouped).forEach(item => {
        const row = b2csSheet.addRow([
          'OE',
          item.placeOfSupply,
          '',
          item.rate,
          item.taxableValue.toFixed(2),
          item.cessAmount.toFixed(2),
          ''
        ]);
        row.eachCell((cell) => applyDataStyle(cell));
      });

      b2csSheet.columns = b2csHeaders.map(() => ({ width: 18 }));

      // ==================== SHEET 4: CDNR (9B - Registered) ====================
      const cdnrSheet = workbook.addWorksheet('cdnr');
      const cdnrNotes = (reportData.creditNotes || []).filter(note => note.customerGstin && note.customerGstin.trim() !== '');
      const cdnrTotalNoteValue = cdnrNotes.reduce((sum, note) => sum + (note.grandTotal || 0), 0);

      cdnrSheet.addRow(['Summary For CDNR (9B) - Credit/Debit Notes (Registered)']);
      applyTitleStyle(cdnrSheet.getCell('A1'));

      cdnrSheet.addRow(['No. of Notes', '', 'Total Note Value']);
      cdnrSheet.getRow(2).eachCell((cell) => applySummaryStyle(cell));
      cdnrSheet.addRow([cdnrNotes.length, '', cdnrTotalNoteValue.toFixed(2)]);

      cdnrSheet.addRow([]);

      const cdnrHeaders = ['GSTIN/UIN of Recipient', 'Receiver Name', 'Note Number', 'Note Date', 'Note Type', 'Reason', 'Original Invoice Number', 'Original Invoice Date', 'Note Value', 'Rate', 'Taxable Value', 'IGST', 'CGST', 'SGST'];
      cdnrSheet.addRow(cdnrHeaders);
      cdnrSheet.getRow(5).eachCell((cell) => applyHeaderStyle(cell));

      cdnrNotes.forEach(note => {
        const row = cdnrSheet.addRow([
          note.customerGstin || '',
          note.customerName || '',
          note.creditNoteNumber || '',
          formatDate(note.returnDate),
          'C',
          note.reason || 'Sales Return',
          note.originalInvoiceNumber || '',
          note.originalInvoiceDate ? formatDate(note.originalInvoiceDate) : '',
          (note.grandTotal || 0).toFixed(2),
          note.gstRate || 0,
          (note.subtotal || 0).toFixed(2),
          (note.totalIGST || 0).toFixed(2),
          (note.totalCGST || 0).toFixed(2),
          (note.totalSGST || 0).toFixed(2)
        ]);
        row.eachCell((cell) => applyDataStyle(cell));
      });

      cdnrSheet.columns = cdnrHeaders.map(() => ({ width: 18 }));

      // ==================== SHEET 5: CDNUR (9B - Unregistered) ====================
      const cdnurSheet = workbook.addWorksheet('cdnur');
      const cdnurNotes = (reportData.creditNotes || []).filter(note => !note.customerGstin || note.customerGstin.trim() === '');
      const cdnurTotalNoteValue = cdnurNotes.reduce((sum, note) => sum + (note.grandTotal || 0), 0);

      cdnurSheet.addRow(['Summary For CDNUR (9B) - Credit/Debit Notes (Unregistered)']);
      applyTitleStyle(cdnurSheet.getCell('A1'));

      cdnurSheet.addRow(['No. of Notes', '', 'Total Note Value']);
      cdnurSheet.getRow(2).eachCell((cell) => applySummaryStyle(cell));
      cdnurSheet.addRow([cdnurNotes.length, '', cdnurTotalNoteValue.toFixed(2)]);

      cdnurSheet.addRow([]);

      const cdnurHeaders = ['Note Number', 'Note Date', 'Note Type', 'Reason', 'Original Invoice Number', 'Original Invoice Date', 'Note Value', 'Rate', 'Taxable Value', 'IGST', 'CGST', 'SGST'];
      cdnurSheet.addRow(cdnurHeaders);
      cdnurSheet.getRow(5).eachCell((cell) => applyHeaderStyle(cell));

      cdnurNotes.forEach(note => {
        const row = cdnurSheet.addRow([
          note.creditNoteNumber || '',
          formatDate(note.returnDate),
          'C',
          note.reason || 'Sales Return',
          note.originalInvoiceNumber || '',
          note.originalInvoiceDate ? formatDate(note.originalInvoiceDate) : '',
          (note.grandTotal || 0).toFixed(2),
          note.gstRate || 0,
          (note.subtotal || 0).toFixed(2),
          (note.totalIGST || 0).toFixed(2),
          (note.totalCGST || 0).toFixed(2),
          (note.totalSGST || 0).toFixed(2)
        ]);
        row.eachCell((cell) => applyDataStyle(cell));
      });

      cdnurSheet.columns = cdnurHeaders.map(() => ({ width: 18 }));

      // ==================== SHEET 6: EXP (6A - Exports) ====================
      const expSheet = workbook.addWorksheet('exp');

      expSheet.addRow(['Summary For EXP (6A) - Exports']);
      applyTitleStyle(expSheet.getCell('A1'));

      expSheet.addRow(['No. of Invoices', '', 'Total Invoice Value']);
      expSheet.getRow(2).eachCell((cell) => applySummaryStyle(cell));
      expSheet.addRow([0, '', '0.00']);

      expSheet.addRow([]);

      const expHeaders = ['Export Type', 'Invoice Number', 'Invoice Date', 'Invoice Value', 'Port Code', 'Shipping Bill Number', 'Shipping Bill Date', 'Rate', 'Taxable Value'];
      expSheet.addRow(expHeaders);
      expSheet.getRow(5).eachCell((cell) => applyHeaderStyle(cell));

      expSheet.columns = expHeaders.map(() => ({ width: 18 }));

      // ==================== SHEET 7: HSN (12 - HSN Summary) ====================
      const hsnSheet = workbook.addWorksheet('hsn');
      const hsnGrouped = {};

      allInvoices.forEach(invoice => {
        if (invoice.items && invoice.items.length > 0) {
          invoice.items.forEach(item => {
            const hsn = item.hsnCode || 'N/A';
            if (!hsnGrouped[hsn]) {
              hsnGrouped[hsn] = {
                hsnCode: hsn,
                description: item.productName || '',
                uqc: item.unit || 'PCS',
                totalQuantity: 0,
                totalValue: 0,
                taxableValue: 0,
                igst: 0,
                cgst: 0,
                sgst: 0,
                cess: 0,
                gstRate: item.gstRate || 0
              };
            }
            hsnGrouped[hsn].totalQuantity += item.quantity || 0;
            hsnGrouped[hsn].totalValue += item.totalAmount || 0;
            hsnGrouped[hsn].taxableValue += item.taxableAmount || 0;
            hsnGrouped[hsn].igst += item.igst || 0;
            hsnGrouped[hsn].cgst += item.cgst || 0;
            hsnGrouped[hsn].sgst += item.sgst || 0;
            hsnGrouped[hsn].cess += item.cessAmount || 0;
          });
        }
      });

      const hsnList = Object.values(hsnGrouped);
      const hsnTotalValue = hsnList.reduce((sum, hsn) => sum + hsn.totalValue, 0);
      const hsnTotalTaxableValue = hsnList.reduce((sum, hsn) => sum + hsn.taxableValue, 0);
      const hsnTotalIGST = hsnList.reduce((sum, hsn) => sum + hsn.igst, 0);
      const hsnTotalCGST = hsnList.reduce((sum, hsn) => sum + hsn.cgst, 0);
      const hsnTotalSGST = hsnList.reduce((sum, hsn) => sum + hsn.sgst, 0);
      const hsnTotalCess = hsnList.reduce((sum, hsn) => sum + hsn.cess, 0);

      hsnSheet.addRow(['Summary For HSN (12)']);
      applyTitleStyle(hsnSheet.getCell('A1'));

      hsnSheet.addRow(['No. of HSN', '', 'Total Value', '', 'Total Taxable Value', 'Total Integrated Tax', 'Total Central Tax', 'Total State/UT Tax', 'Total Cess']);
      hsnSheet.getRow(2).eachCell((cell) => applySummaryStyle(cell));
      hsnSheet.addRow([hsnList.length, '', hsnTotalValue.toFixed(2), '', hsnTotalTaxableValue.toFixed(2), hsnTotalIGST.toFixed(2), hsnTotalCGST.toFixed(2), hsnTotalSGST.toFixed(2), hsnTotalCess.toFixed(2)]);

      hsnSheet.addRow([]);

      const hsnHeaders = ['HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Rate', 'Taxable Value', 'Integrated Tax Amount', 'Central Tax Amount', 'State/UT Tax Amount', 'Cess Amount'];
      hsnSheet.addRow(hsnHeaders);
      hsnSheet.getRow(5).eachCell((cell) => applyHeaderStyle(cell));

      hsnList.forEach(hsn => {
        const row = hsnSheet.addRow([
          hsn.hsnCode,
          hsn.description,
          hsn.uqc,
          hsn.totalQuantity,
          hsn.totalValue.toFixed(2),
          hsn.gstRate,
          hsn.taxableValue.toFixed(2),
          hsn.igst.toFixed(2),
          hsn.cgst.toFixed(2),
          hsn.sgst.toFixed(2),
          hsn.cess.toFixed(2)
        ]);
        row.eachCell((cell) => applyDataStyle(cell));
      });

      hsnSheet.columns = hsnHeaders.map(() => ({ width: 18 }));

      // ==================== SHEET 8: DOCS (13 - Documents Issued) ====================
      const docsSheet = workbook.addWorksheet('docs');
      const firstInvoice = allInvoices.length > 0 ? allInvoices[0].invoiceNumber : '';
      const lastInvoice = allInvoices.length > 0 ? allInvoices[allInvoices.length - 1].invoiceNumber : '';
      const totalCreditNotes = (reportData.creditNotes || []).length;
      const firstCreditNote = totalCreditNotes > 0 ? reportData.creditNotes[0].creditNoteNumber : '';
      const lastCreditNote = totalCreditNotes > 0 ? reportData.creditNotes[totalCreditNotes - 1].creditNoteNumber : '';

      docsSheet.addRow(['Summary of documents issued during the tax period (13)']);
      applyTitleStyle(docsSheet.getCell('A1'));

      const docsHeaders = ['Nature of Document', 'Sr. No. From', 'Sr. No. To', 'Total Number', 'Cancelled'];
      docsSheet.addRow(docsHeaders);
      docsSheet.getRow(2).eachCell((cell) => applyHeaderStyle(cell));

      const docsData = [
        ['Invoices for outward supply', firstInvoice, lastInvoice, allInvoices.length, 0],
        ['Credit Notes', firstCreditNote, lastCreditNote, totalCreditNotes, 0],
        ['Debit Notes', '', '', 0, 0]
      ];

      docsData.forEach(data => {
        const row = docsSheet.addRow(data);
        row.eachCell((cell) => applyDataStyle(cell));
      });

      docsSheet.columns = docsHeaders.map(() => ({ width: 25 }));

      // Write file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportName}_${dateStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    else if (activeTab === 'gstr3b') {
      const workbook = XLSX.utils.book_new();
      const gstr3bData = [
        ['GSTR-3B Report'],
        ['Period', `${dateRange.startDate} to ${dateRange.endDate}`],
        [''],
        ['Summary'],
        ['Total Sales', reportData.summary.totalSales.toFixed(2)],
        ['Total Purchases', reportData.summary.totalPurchases.toFixed(2)],
        ['Output Tax', reportData.summary.totalOutputTax.toFixed(2)],
        ['Input Tax', reportData.summary.totalInputTax.toFixed(2)],
        ['Net Tax Payable', reportData.summary.netTaxPayable.toFixed(2)],
        [''],
        ['Outward Supplies'],
        ['Description', 'Taxable Value', 'CGST', 'SGST', 'IGST'],
        ['Total Outward Supplies',
          reportData.outwardSupplies.taxableValue.toFixed(2),
          reportData.outwardSupplies.cgst.toFixed(2),
          reportData.outwardSupplies.sgst.toFixed(2),
          reportData.outwardSupplies.igst.toFixed(2)
        ],
        [''],
        ['Inward Supplies (ITC)'],
        ['Description', 'Taxable Value', 'CGST', 'SGST', 'IGST'],
        ['Total ITC Available',
          reportData.itcAvailable.taxableValue.toFixed(2),
          reportData.itcAvailable.cgst.toFixed(2),
          reportData.itcAvailable.sgst.toFixed(2),
          reportData.itcAvailable.igst.toFixed(2)
        ],
        [''],
        ['Net Tax Liability'],
        ['CGST', 'SGST', 'IGST', 'Total'],
        [
          reportData.netTaxLiability.cgst.toFixed(2),
          reportData.netTaxLiability.sgst.toFixed(2),
          reportData.netTaxLiability.igst.toFixed(2),
          reportData.netTaxLiability.total.toFixed(2)
        ]
      ];
      const gstr3bWS = XLSX.utils.aoa_to_sheet(gstr3bData);
      XLSX.utils.book_append_sheet(workbook, gstr3bWS, 'GSTR-3B');
    }
    else if (activeTab === 'taxSummary') {
      const workbook = XLSX.utils.book_new();
      // Sales Tax sheet
      const salesData = Object.entries(reportData.salesTaxByRate).map(([rate, data]) => ({
        'GST Rate': `${rate}%`,
        'Count': data.count,
        'Taxable Value': data.taxableValue.toFixed(2),
        'CGST': data.cgst.toFixed(2),
        'SGST': data.sgst.toFixed(2),
        'IGST': data.igst.toFixed(2),
        'Total Tax': data.totalTax.toFixed(2)
      }));
      const salesWS = XLSX.utils.json_to_sheet(salesData);
      XLSX.utils.book_append_sheet(workbook, salesWS, 'Sales Tax');

      // Purchase Tax sheet
      const purchaseData = Object.entries(reportData.purchaseTaxByRate).map(([rate, data]) => ({
        'GST Rate': `${rate}%`,
        'Count': data.count,
        'Taxable Value': data.taxableValue.toFixed(2),
        'CGST': data.cgst.toFixed(2),
        'SGST': data.sgst.toFixed(2),
        'IGST': data.igst.toFixed(2),
        'Total Tax': data.totalTax.toFixed(2)
      }));
      const purchaseWS = XLSX.utils.json_to_sheet(purchaseData);
      XLSX.utils.book_append_sheet(workbook, purchaseWS, 'Purchase Tax');

      // Summary sheet
      const summaryData = [
        ['Tax Summary Report'],
        ['Period', `${dateRange.startDate} to ${dateRange.endDate}`],
        [''],
        ['Summary'],
        ['Total Sales Tax', reportData.summary.totalSalesTax.toFixed(2)],
        ['Total Purchase Tax', reportData.summary.totalPurchaseTax.toFixed(2)],
        ['Net Tax Liability', reportData.summary.netTaxLiability.toFixed(2)]
      ];
      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWS, 'Summary');
    }
    else if (activeTab === 'hsnSummary') {
      const workbook = XLSX.utils.book_new();
      const hsnData = reportData.hsnList.map(hsn => ({
        'HSN Code': hsn.hsnCode,
        'Description': hsn.description,
        'UQC': hsn.uqc,
        'Quantity': hsn.totalQuantity.toFixed(0),
        'Taxable Value': hsn.taxableValue.toFixed(2),
        'CGST': hsn.cgst.toFixed(2),
        'SGST': hsn.sgst.toFixed(2),
        'IGST': hsn.igst.toFixed(2),
        'GST Rate': `${hsn.gstRate}%`,
        'Total Tax': hsn.totalTax.toFixed(2)
      }));
      const hsnWS = XLSX.utils.json_to_sheet(hsnData);
      XLSX.utils.book_append_sheet(workbook, hsnWS, 'HSN Summary');

      // Summary
      const summaryData = [
        ['HSN Summary Report'],
        ['Period', `${dateRange.startDate} to ${dateRange.endDate}`],
        [''],
        ['Summary'],
        ['Total HSN Codes', reportData.summary.totalHSNCodes],
        ['Total Quantity', reportData.summary.totalQuantity.toFixed(0)],
        ['Total Taxable Value', reportData.summary.totalTaxableValue.toFixed(2)],
        ['Total Tax', reportData.summary.totalTax.toFixed(2)],
        ['Total Value', reportData.summary.totalValue.toFixed(2)]
      ];
      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWS, 'Summary');
    }

    // Write file
    XLSX.writeFile(workbook, `${reportName}_${dateStr}.xlsx`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center no-print">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">GST Reports</h1>
            <p className="text-gray-500 mt-1">Generate and export GST compliance reports</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleExport('json')}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <HiDownload className="w-5 h-5" />
              Export JSON
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <HiDownload className="w-5 h-5" />
              Export Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <HiDownload className="w-5 h-5" />
              Export PDF
            </button>
          </div>
        </div>

        {/* PDF Export Help Banner */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 no-print">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-amber-800">
                📄 For clean PDF exports: Turn OFF "Headers and footers" in your browser's print dialog
              </p>
              <p className="mt-1 text-xs text-amber-700">
                This removes the browser-generated date/time text that appears at the top of PDFs (e.g., "14/12/2025, 02:38 {shopName} - Billing Software")
              </p>
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow p-6 no-print">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Period</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-black">
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
            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow print-content">
          {/* Print-only header */}
          <div className="hidden print:block border-b-2 border-gray-800 pb-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="relative h-16 w-40">
                <img
                  src="/Logo.jpeg"
                  alt={shopName}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-bold text-gray-900">
                  {tabs.find(t => t.id === activeTab)?.name} Report
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {shopSettings?.shopName || shopName}
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>
                <strong>Period:</strong> {new Date(dateRange.startDate).toLocaleDateString('en-IN')} to {new Date(dateRange.endDate).toLocaleDateString('en-IN')}
              </p>
              <p className="mt-1">
                <strong>Generated on:</strong> {new Date().toLocaleString('en-IN')}
              </p>
              {shopSettings?.gstin && (
                <p className="mt-1">
                  <strong>GSTIN:</strong> {shopSettings.gstin}
                </p>
              )}
            </div>
          </div>

          <div className="border-b border-gray-200 no-print">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <div className="flex flex-col items-center">
                    <span>{tab.name}</span>
                    <span className="text-xs text-gray-400 mt-1">{tab.description}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'gstr1' && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">GSTR-1 Report</h3>
                <p className="text-gray-600 mb-6">Details of outward supplies of goods and/or services</p>

                {!reportData && !loading && (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <HiDocumentReport className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a date range and click "Generate Report" to view GSTR-1 data</p>
                    <p className="text-sm text-gray-400 mt-2">This report will show all B2B, B2C, and export invoices</p>
                  </div>
                )}

                {loading && (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <LoadingSpinner size="lg" text="Generating report..." />
                  </div>
                )}

                {reportData && !loading && (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total Invoices</p>
                        <p className="text-2xl font-bold text-gray-900">{reportData.summary?.totalInvoices || 0}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Taxable Value</p>
                        <p className="text-2xl font-bold text-gray-900">₹{(reportData.summary?.totalTaxableValue || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total Tax</p>
                        <p className="text-2xl font-bold text-gray-900">₹{(reportData.summary?.totalTax || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Invoice Value</p>
                        <p className="text-2xl font-bold text-gray-900">₹{(reportData.summary?.totalInvoiceValue || 0).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Category Breakdown */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-600 mb-2">B2B Invoices</p>
                        <p className="text-xl font-bold text-emerald-600">{reportData.summary?.b2bCount || 0}</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-600 mb-2">B2C Large (&gt;₹2.5L)</p>
                        <p className="text-xl font-bold text-blue-600">{reportData.summary?.b2cLargeCount || 0}</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-600 mb-2">B2C Small (&le;₹2.5L)</p>
                        <p className="text-xl font-bold text-purple-600">{reportData.summary?.b2cSmallCount || 0}</p>
                      </div>
                    </div>

                    {/* GST Rate-wise Summary */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">GST Rate-wise Summary</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST Rate</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxable Value</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CGST</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">SGST</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">IGST</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Tax</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {Object.entries(reportData.gstRateTotals || {}).map(([rate, data]) => (
                              <tr key={rate}>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{rate}%</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₹{data.taxableValue.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₹{data.cgst.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₹{data.sgst.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₹{data.igst.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">₹{data.totalTax.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* B2B Invoices */}
                    {reportData.b2bInvoices && reportData.b2bInvoices.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">B2B Invoices ({reportData.b2bInvoices.length})</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice No</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GSTIN</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxable Value</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CGST</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">SGST</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">IGST</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {reportData.b2bInvoices.map((inv) => (
                                <tr key={inv.invoiceNumber}>
                                  <td className="px-4 py-3 text-sm font-medium text-blue-600">{inv.invoiceNumber}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{inv.customerName}</td>
                                  <td className="px-4 py-3 text-sm text-gray-600">{inv.gstin}</td>
                                  <td className="px-4 py-3 text-sm text-right text-gray-900">₹{inv.taxableValue.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-sm text-right text-gray-900">₹{inv.cgst.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-sm text-right text-gray-900">₹{inv.sgst.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-sm text-right text-gray-900">₹{inv.igst.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">₹{inv.invoiceValue.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* B2C Small Summary */}
                    {reportData.b2cSmallSummary?.count > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">B2C Small Summary</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Total Invoices</p>
                              <p className="text-lg font-bold text-gray-900">{reportData.b2cSmallSummary?.count || 0}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Taxable Value</p>
                              <p className="text-lg font-bold text-gray-900">₹{(reportData.b2cSmallSummary?.taxableValue || 0).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Total Tax</p>
                              <p className="text-lg font-bold text-gray-900">₹{(reportData.b2cSmallSummary?.totalTax || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'gstr3b' && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">GSTR-3B Report</h3>
                <p className="text-gray-600 mb-6">Summary return for the tax period</p>

                {!reportData && !loading && (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <HiDocumentReport className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a date range and click "Generate Report" to view GSTR-3B summary</p>
                    <p className="text-sm text-gray-400 mt-2">This report will show tax liability and input tax credit</p>
                  </div>
                )}

                {loading && (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <LoadingSpinner size="lg" text="Generating report..." />
                  </div>
                )}

                {reportData && !loading && (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total Sales</p>
                        <p className="text-2xl font-bold text-gray-900">₹{(reportData.summary?.totalSales || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total Purchases</p>
                        <p className="text-2xl font-bold text-gray-900">₹{(reportData.summary?.totalPurchases || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Output Tax</p>
                        <p className="text-2xl font-bold text-gray-900">₹{(reportData.summary?.totalOutputTax || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Net Tax Payable</p>
                        <p className="text-2xl font-bold text-emerald-600">₹{(reportData.summary?.netTaxPayable || 0).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Outward Supplies */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Outward Supplies (Sales)</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxable Value</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CGST</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">SGST</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">IGST</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            <tr>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">Total Outward Supplies</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">₹{(reportData.outwardSupplies?.taxableValue || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">₹{(reportData.outwardSupplies?.cgst || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">₹{(reportData.outwardSupplies?.sgst || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">₹{(reportData.outwardSupplies?.igst || 0).toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Inward Supplies - ITC Available */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Inward Supplies (ITC Available)</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxable Value</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CGST</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">SGST</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">IGST</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            <tr>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">Total ITC Available</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">₹{(reportData.itcAvailable?.taxableValue || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">₹{(reportData.itcAvailable?.cgst || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">₹{(reportData.itcAvailable?.sgst || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">₹{(reportData.itcAvailable?.igst || 0).toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Net Tax Liability */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Net Tax Liability</h4>
                      <div className="bg-emerald-50 rounded-lg p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">CGST Payable</p>
                            <p className="text-xl font-bold text-gray-900">₹{(reportData.netTaxLiability?.cgst || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">SGST Payable</p>
                            <p className="text-xl font-bold text-gray-900">₹{(reportData.netTaxLiability?.sgst || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">IGST Payable</p>
                            <p className="text-xl font-bold text-gray-900">₹{(reportData.netTaxLiability?.igst || 0).toFixed(2)}</p>
                          </div>
                          <div className="bg-emerald-100 rounded-lg p-4">
                            <p className="text-sm text-gray-700 mb-1 font-medium">Total Tax Payable</p>
                            <p className="text-2xl font-bold text-emerald-700">₹{(reportData.netTaxLiability?.total || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'taxSummary' && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Tax Summary Report</h3>
                <p className="text-gray-600 mb-6">Detailed breakdown of CGST, SGST, and IGST</p>

                {!reportData && !loading && (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <HiDocumentReport className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a date range and click "Generate Report" to view tax summary</p>
                    <p className="text-sm text-gray-400 mt-2">This report will show sales tax, purchase tax, and net tax liability</p>
                  </div>
                )}

                {loading && (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <LoadingSpinner size="lg" text="Generating report..." />
                  </div>
                )}

                {reportData && !loading && (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total Sales Tax</p>
                        <p className="text-2xl font-bold text-gray-900">₹{(reportData.summary?.totalSalesTax || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total Purchase Tax (ITC)</p>
                        <p className="text-2xl font-bold text-gray-900">₹{(reportData.summary?.totalPurchaseTax || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Net Tax Liability</p>
                        <p className="text-2xl font-bold text-emerald-600">₹{(reportData.summary?.netTaxLiability || 0).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Sales Tax by Rate */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Sales Tax by Rate</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST Rate</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxable Value</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CGST</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">SGST</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">IGST</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Tax</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {Object.entries(reportData.salesTaxByRate || {}).map(([rate, data]) => (
                              <tr key={rate}>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{rate}%</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">{data.count}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₹{data.taxableValue.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₹{data.cgst.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₹{data.sgst.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₹{data.igst.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">₹{data.totalTax.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Purchase Tax by Rate */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Purchase Tax by Rate</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST Rate</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxable Value</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CGST</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">SGST</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">IGST</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Tax</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {Object.entries(reportData.purchaseTaxByRate || {}).map(([rate, data]) => (
                              <tr key={rate}>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{rate}%</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">{data.count}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₹{data.taxableValue.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₹{data.cgst.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₹{data.sgst.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₹{data.igst.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">₹{data.totalTax.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'hsnSummary' && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">HSN Summary Report</h3>
                <p className="text-gray-600 mb-6">HSN-wise summary of outward supplies</p>

                {!reportData && !loading && (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <HiDocumentReport className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a date range and click "Generate Report" to view HSN summary</p>
                    <p className="text-sm text-gray-400 mt-2">This report will show HSN-wise quantity, taxable value, and tax amount</p>
                  </div>
                )}

                {loading && (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <LoadingSpinner size="lg" text="Generating report..." />
                  </div>
                )}

                {reportData && !loading && (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total HSN Codes</p>
                        <p className="text-2xl font-bold text-gray-900">{reportData.summary?.totalHSNCodes || 0}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total Quantity</p>
                        <p className="text-2xl font-bold text-gray-900">{(reportData.summary?.totalQuantity || 0).toFixed(0)}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Taxable Value</p>
                        <p className="text-2xl font-bold text-gray-900">₹{(reportData.summary?.totalTaxableValue || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total Tax</p>
                        <p className="text-2xl font-bold text-gray-900">₹{(reportData.summary?.totalTax || 0).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* HSN-wise Details */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">HSN-wise Details</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HSN Code</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UQC</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxable Value</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CGST</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">SGST</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">IGST</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">GST Rate</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Tax</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {(reportData.hsnList || []).map((hsn) => (
                              <tr key={hsn.hsnCode}>
                                <td className="px-4 py-3 text-sm font-medium text-blue-600">{hsn.hsnCode}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{hsn.description}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{hsn.uqc}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">{hsn.totalQuantity.toFixed(0)}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₹{hsn.taxableValue.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₹{hsn.cgst.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₹{hsn.sgst.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">₹{hsn.igst.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-600">{hsn.gstRate}%</td>
                                <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">₹{hsn.totalTax.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @page {
          size: A4;
          margin: 15mm;
        }

        @media print {
          /* Hide everything except the report content */
          body * {
            visibility: hidden;
          }

          .no-print,
          nav,
          aside,
          header,
          .sidebar,
          button,
          .mobile-header {
            display: none !important;
          }

          /* Show print-only elements */
          .print\:block {
            display: block !important;
          }

          /* Show only the report content */
          .print-content,
          .print-content * {
            visibility: visible;
          }

          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            margin: 0;
            background: white;
          }

          /* General print styles */
          html,
          body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            background: white;
            font-size: 12pt;
          }

          /* Table improvements */
          table {
            page-break-inside: auto;
            border-collapse: collapse;
            width: 100%;
            font-size: 10pt;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
            font-weight: bold;
          }

          tbody {
            display: table-row-group;
          }

          /* Prevent orphans and widows */
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
            page-break-inside: avoid;
          }

          /* Card and section styling */
          .space-y-6 > * {
            margin-bottom: 15px !important;
          }

          /* Grid layouts - avoid breaking */
          .grid {
            page-break-inside: avoid;
          }

          /* Allow tables to break across pages if needed */
          .overflow-x-auto {
            overflow: visible !important;
            page-break-inside: auto;
          }

          /* Section headings */
          h3, h4 {
            margin-top: 20px;
            margin-bottom: 10px;
          }

          /* Ensure colors print */
          .bg-blue-50,
          .bg-green-50,
          .bg-purple-50,
          .bg-orange-50,
          .bg-emerald-50,
          .bg-gray-50 {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          /* Smaller text for tables to fit better */
          td, th {
            padding: 4px 8px !important;
            font-size: 9pt;
          }

          /* Summary cards */
          .grid.grid-cols-1,
          .grid.grid-cols-3,
          .grid.grid-cols-4 {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            page-break-inside: avoid;
          }

          .grid > div {
            flex: 1;
            min-width: 150px;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
