'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { productsAPI, customersAPI, invoicesAPI, shopAPI, servicesAPI, quotationsAPI, proformaInvoicesAPI, deliveryChallansAPI } from '@/utils/api';
import { useInvoicesStore } from '@/store/useInvoicesStore';
import { calculateInvoiceTotals, calculateItemWithDiscount, calculateItemDisplayTotal, validateDiscount, validateInvoiceTotals } from '@/utils/calculations';
import { HiPlus, HiSearch, HiX, HiExclamation, HiLightningBolt, HiCube } from 'react-icons/hi';

function NewInvoiceContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { invalidate: invalidateInvoices } = useInvoicesStore();
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [shopSettings, setShopSettings] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [taxType, setTaxType] = useState('CGST_SGST');
  const [cessRate, setCessRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentDetails, setPaymentDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('Cash Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [fromQuotationId, setFromQuotationId] = useState(null); // Store quotation ID if converting
  const [quotationLoaded, setQuotationLoaded] = useState(false); // Track if quotation data was loaded
  const [fromProformaId, setFromProformaId] = useState(null); // Store proforma ID if converting
  const [proformaLoaded, setProformaLoaded] = useState(false); // Track if proforma data was loaded
  const [fromChallanId, setFromChallanId] = useState(null); // Store challan ID if converting
  const [challanLoaded, setChallanLoaded] = useState(false); // Track if challan data was loaded

  // Transportation details accordion
  const [showTransport, setShowTransport] = useState(false);
  const [transport, setTransport] = useState({
    mode: '',
    docNumber: '',
    docDate: '',
    vehicleNumber: '',
    approxDist: '',
    pos: '',
    supplyDate: '',
    transporterId: '',
    transporterName: '',
  });

  // Purchase Order accordion
  const [showPO, setShowPO] = useState(false);
  const [po, setPo] = useState({ poNumber: '', poDate: '' });

  // Additional Invoice Details accordion
  const [showAdditional, setShowAdditional] = useState(false);
  const [additionalDetails, setAdditionalDetails] = useState({
    eWayBillNumber: '',
    deliveryNote: '',
    referenceNo: '',
    otherReferences: '',
    termsOfDelivery: '',
    destination: '',
  });

  // Customer dropdown search state
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Ship To (frontend only — backend wiring later)
  const [shipTo, setShipTo] = useState({ name: '', address: '', city: '', state: '', pincode: '' });

  // Customer modal state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerFormErrors, setCustomerFormErrors] = useState({});
  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      loadData();
    }
  }, [user, loading, router]);

  // Check if coming from quotation
  useEffect(() => {
    const quotationId = searchParams.get('fromQuotation');
    if (quotationId && user && products.length > 0 && !quotationLoaded) {
      loadQuotationData(quotationId);
      setQuotationLoaded(true);
    }
  }, [searchParams, user, products, quotationLoaded]);

  // Check if coming from proforma invoice
  useEffect(() => {
    const proformaId = searchParams.get('fromProforma');
    if (proformaId && user && products.length > 0 && !proformaLoaded) {
      loadProformaData(proformaId);
      setProformaLoaded(true);
    }
  }, [searchParams, user, products, proformaLoaded]);

  // Check if coming from delivery challan
  useEffect(() => {
    const challanId = searchParams.get('fromChallan');
    if (challanId && user && products.length > 0 && !challanLoaded) {
      loadChallanData(challanId);
      setChallanLoaded(true);
    }
  }, [searchParams, user, products, challanLoaded]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isCustomerDropdownOpen && !event.target.closest('.customer-dropdown-container')) {
        setIsCustomerDropdownOpen(false);
        setCustomerSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCustomerDropdownOpen]);

  const loadData = async () => {
    try {
      const [batchesData, customersData, shopData, servicesData] = await Promise.all([
        productsAPI.getBatchesForInvoice(),
        customersAPI.getAll(),
        shopAPI.get(),
        servicesAPI.getAll().catch(() => []),
      ]);
      setProducts(batchesData);
      setCustomers(customersData);
      setShopSettings(shopData);
      setServices(servicesData);
      if (shopData?.defaultTaxType) {
        setTaxType(shopData.defaultTaxType);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadQuotationData = async (quotationId) => {
    try {
      toast.info('Loading quotation data...');
      const quotation = await quotationsAPI.getOne(quotationId);

      // Store quotation ID for later update
      setFromQuotationId(quotationId);

      // Pre-fill customer information
      setCustomerName(quotation.customerName || 'Cash Customer');
      setCustomerPhone(quotation.customerPhone || '');
      setSelectedCustomer(quotation.customer || null);

      // Pre-fill items from quotation
      const mappedItems = quotation.items.map(item => {
        const itemType = item.itemType || 'product';

        if (itemType === 'service') {
          // Service item
          return {
            itemType: 'service',
            serviceId: item.service?._id || item.service || '',
            serviceName: item.serviceName || item.service?.name || '',
            sacCode: item.sacCode || item.service?.sacCode || '',
            quantity: item.quantity || 1,
            unit: item.unit || 'NOS',
            sellingPrice: item.sellingPrice || 0,
            gstRate: item.gstRate || 0,
            cessRate: item.cessRate || 0,
          };
        } else {
          // Product item - need to find matching batch
          const productId = item.product?._id || item.product;
          const batchId = item.batch?._id || item.batch;

          // Find matching batch in products array
          let matchedBatch = null;
          if (productId && batchId) {
            matchedBatch = products.find(b =>
              b.productId === productId && b.batchId === batchId
            );
          } else if (productId) {
            // If no batchId, try to find any batch for this product
            matchedBatch = products.find(b => b.productId === productId);
          }

          return {
            itemType: 'product',
            product: productId || '',
            batch: batchId || null,
            selectedBatch: matchedBatch ? JSON.stringify(matchedBatch) : '',
            productName: item.productName || item.product?.name || '',
            hsnCode: item.hsnCode || item.product?.hsnCode || '',
            quantity: item.quantity || 1,
            unit: item.unit || 'pcs',
            sellingPrice: item.sellingPrice || 0,
            gstRate: item.gstRate || 0,
            cessRate: item.cessRate || 0,
            batchNo: item.batchNo || '',
            expiryDate: item.expiryDate || '',
          };
        }
      });
      setInvoiceItems(mappedItems);

      // Pre-fill tax type and other details
      if (quotation.taxType) {
        setTaxType(quotation.taxType);
      }
      if (quotation.discount) {
        setDiscount(quotation.discount);
      }
      if (quotation.notes) {
        setNotes(quotation.notes);
      }

      toast.success('Quotation data loaded! Review and create invoice.');
    } catch (error) {
      console.error('Error loading quotation:', error);
      toast.error('Failed to load quotation data');
    }
  };

  const loadProformaData = async (proformaId) => {
    try {
      toast.info('Loading proforma invoice data...');
      const proforma = await proformaInvoicesAPI.getOne(proformaId);

      // Store proforma ID for later update
      setFromProformaId(proformaId);

      // Pre-fill customer information
      setCustomerName(proforma.customerName || 'Cash Customer');
      setCustomerPhone(proforma.customerPhone || '');
      setSelectedCustomer(proforma.customer || null);

      // Pre-fill items from proforma
      const mappedItems = proforma.items.map(item => {
        const itemType = item.itemType || 'product';

        if (itemType === 'service') {
          // Service item
          return {
            itemType: 'service',
            serviceId: item.service?._id || item.service || '',
            serviceName: item.serviceName || item.service?.name || '',
            sacCode: item.sacCode || item.service?.sacCode || '',
            quantity: item.quantity || 1,
            unit: item.unit || 'NOS',
            sellingPrice: item.sellingPrice || 0,
            gstRate: item.gstRate || 0,
            cessRate: item.cessRate || 0,
          };
        } else {
          // Product item - need to find matching batch
          const productId = item.product?._id || item.product;
          const batchId = item.batch?._id || item.batch;

          // Find matching batch in products array
          let matchedBatch = null;
          if (productId && batchId) {
            matchedBatch = products.find(b =>
              b.productId === productId && b.batchId === batchId
            );
          } else if (productId) {
            // If no batchId, try to find any batch for this product
            matchedBatch = products.find(b => b.productId === productId);
          }

          return {
            itemType: 'product',
            product: productId || '',
            batch: batchId || null,
            selectedBatch: matchedBatch ? JSON.stringify(matchedBatch) : '',
            productName: item.productName || item.product?.name || '',
            hsnCode: item.hsnCode || item.product?.hsnCode || '',
            quantity: item.quantity || 1,
            unit: item.unit || 'pcs',
            sellingPrice: item.sellingPrice || 0,
            gstRate: item.gstRate || 0,
            cessRate: item.cessRate || 0,
            batchNo: item.batchNo || '',
            expiryDate: item.expiryDate || '',
          };
        }
      });
      setInvoiceItems(mappedItems);

      // Pre-fill tax type and other details
      if (proforma.taxType) {
        setTaxType(proforma.taxType);
      }
      if (proforma.discount) {
        setDiscount(proforma.discount);
      }
      if (proforma.notes) {
        setNotes(proforma.notes);
      }

      toast.success('Proforma data loaded! Review and create invoice.');
    } catch (error) {
      console.error('Error loading proforma:', error);
      toast.error('Failed to load proforma data');
    }
  };

  const loadChallanData = async (challanId) => {
    try {
      toast.info('Loading delivery challan data...');
      const challan = await deliveryChallansAPI.getOne(challanId);

      // Store challan ID for later update
      setFromChallanId(challanId);

      // Pre-fill customer information
      setCustomerName(challan.customerName || 'Cash Customer');
      setCustomerPhone(challan.customerPhone || '');
      setSelectedCustomer(challan.customer || null);

      // Pre-fill items from challan
      const mappedItems = challan.items.map(item => {
        const itemType = item.itemType || 'product';

        if (itemType === 'service') {
          // Service item
          return {
            itemType: 'service',
            serviceId: item.service?._id || item.service || '',
            serviceName: item.serviceName || item.service?.name || '',
            sacCode: item.sacCode || item.service?.sacCode || '',
            quantity: item.quantity || 1,
            unit: item.unit || 'NOS',
            sellingPrice: item.sellingPrice || 0,
            gstRate: item.gstRate || 0,
            cessRate: item.cessRate || 0,
            description: item.description || '',
          };
        } else {
          // Product item - need to find matching batch
          const productId = item.product?._id || item.product;
          const batchId = item.batch?._id || item.batch;

          // Find matching batch in products array
          let matchedBatch = null;
          if (productId && batchId) {
            matchedBatch = products.find(b =>
              b.productId === productId && b.batchId === batchId
            );
          } else if (productId) {
            // If no batchId, try to find any batch for this product
            matchedBatch = products.find(b => b.productId === productId);
          }

          return {
            itemType: 'product',
            product: productId || '',
            batch: batchId || null,
            selectedBatch: matchedBatch ? JSON.stringify(matchedBatch) : '',
            productName: item.productName || item.product?.name || '',
            hsnCode: item.hsnCode || item.product?.hsnCode || '',
            quantity: item.quantity || 1,
            unit: item.unit || 'pcs',
            sellingPrice: item.sellingPrice || 0,
            gstRate: item.gstRate || 0,
            cessRate: item.cessRate || 0,
            batchNo: item.batchNo || '',
            expiryDate: item.expiryDate || '',
            description: item.description || '',
          };
        }
      });
      setInvoiceItems(mappedItems);

      // Pre-fill tax type and discount
      if (challan.taxType) {
        setTaxType(challan.taxType);
      }
      if (challan.discount) {
        setDiscount(challan.discount);
      }
      if (challan.notes) {
        setNotes(challan.notes);
      }

      // Pre-fill transportation details
      if (challan.transportMode || challan.vehicleNumber || challan.eWayBillNumber) {
        setShowTransport(true);
        setTransport({
          mode: challan.transportMode || '',
          docNumber: challan.transportDocNumber || '',
          docDate: challan.transportDocDate ? new Date(challan.transportDocDate).toISOString().split('T')[0] : '',
          vehicleNumber: challan.vehicleNumber || '',
          approxDist: challan.approxDist || '',
          pos: challan.pos || '',
          supplyDate: challan.supplyDate ? new Date(challan.supplyDate).toISOString().split('T')[0] : '',
          transporterId: challan.transporterId || '',
          transporterName: challan.transporterName || '',
        });
      }

      // Pre-fill PO details
      if (challan.poNumber || challan.poDate) {
        setShowPO(true);
        setPo({
          poNumber: challan.poNumber || '',
          poDate: challan.poDate ? new Date(challan.poDate).toISOString().split('T')[0] : '',
        });
      }

      // Pre-fill additional details
      if (challan.eWayBillNumber || challan.deliveryNote || challan.referenceNo || challan.destination) {
        setShowAdditional(true);
        setAdditionalDetails({
          eWayBillNumber: challan.eWayBillNumber || '',
          deliveryNote: challan.deliveryNote || '',
          referenceNo: challan.referenceNo || '',
          otherReferences: challan.otherReferences || '',
          termsOfDelivery: challan.termsOfDelivery || '',
          destination: challan.destination || '',
        });
      }

      toast.success('Challan data loaded! Review and create invoice.');
    } catch (error) {
      console.error('Error loading challan:', error);
      toast.error('Failed to load challan data');
    }
  };

  const handleCustomerFormChange = (e) => {
    const { name, value } = e.target;
    setCustomerFormData({ ...customerFormData, [name]: value });
    // Clear error for this field
    if (customerFormErrors[name]) {
      setCustomerFormErrors({ ...customerFormErrors, [name]: '' });
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();

    // Validate name and phone are provided
    const newErrors = {};
    if (!customerFormData.name || customerFormData.name.trim() === '') {
      newErrors.name = 'Customer Name is required';
    }
    if (!customerFormData.phone || customerFormData.phone.trim() === '') {
      newErrors.phone = 'Phone Number is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setCustomerFormErrors(newErrors);
      toast.error('Please fill all required fields');
      return;
    }

    setSavingCustomer(true);

    try {
      const newCustomer = await customersAPI.create(customerFormData);
      // Reload customers list
      const customersData = await customersAPI.getAll();
      setCustomers(customersData);
      // Auto-select the newly created customer
      setSelectedCustomer(newCustomer);
      setCustomerName(newCustomer.name);
      setCustomerPhone(newCustomer.phone);
      // Close modal and reset form
      setShowCustomerModal(false);
      setCustomerFormData({
        name: '',
        phone: '',
        email: '',
        gstin: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
      });
      setCustomerFormErrors({});
      toast.success('Customer added successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to add customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  const addItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      { itemType: 'product', product: '', batch: '', selectedBatch: '', quantity: 1, sellingPrice: 0, discountAmount: 0, gstRate: 12, cessRate: 0 },
    ]);
  };

  // Add a product row
  const addProductItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      { itemType: 'product', product: '', batch: '', selectedBatch: '', quantity: 1, sellingPrice: 0, discountAmount: 0, gstRate: 12, cessRate: 0 },
    ]);
  };

  // Add a service row (UI-ready — backend to be wired later)
  const addServiceItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      { itemType: 'service', serviceId: '', serviceName: '', sacCode: '', quantity: 1, sellingPrice: 0, discountAmount: 0, gstRate: 18, cessRate: 0, unit: 'NOS' },
    ]);
  };

  const removeItem = (index) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...invoiceItems];

    // Auto-fill batch/serial details when product is selected
    if (field === 'product' && value) {
      try {
        const batch = JSON.parse(value);
        updated[index].selectedBatch = value; // Store JSON string for dropdown value
        updated[index].batch = batch.batchId; // Store batch ID for backend
        updated[index].product = batch.productId; // Store product ID for backend
        updated[index].sellingPrice = batch.sellingPrice;
        updated[index].gstRate = batch.gstRate;
        updated[index].mrp = batch.mrp;
        updated[index].availableQuantity = batch.availableQuantity; // For validation

        // Handle serial numbers
        if (batch.hasSerial && batch.availableSerials) {
          updated[index].availableSerials = batch.availableSerials; // Store available serials array
          updated[index].serialNumber = null; // Will be set when user selects from dropdown
          updated[index].quantity = 1; // Auto-set quantity to 1 for serial items
          updated[index].hasSerial = true;
        } else {
          updated[index].availableSerials = null;
          updated[index].serialNumber = null;
          updated[index].hasSerial = false;
        }
      } catch (e) {
        // If value is not JSON (backward compatibility), just set the value
        updated[index][field] = value;
      }
    } else {
      updated[index][field] = value;
    }

    setInvoiceItems(updated);
  };

  const handleCustomerChange = (customerId) => {
    if (customerId) {
      const customer = customers.find((c) => c._id === customerId);
      setSelectedCustomer(customer);
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone);
    } else {
      setSelectedCustomer(null);
      setCustomerName('Cash Customer');
      setCustomerPhone('');
    }
    setIsCustomerDropdownOpen(false);
    setCustomerSearchTerm('');
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.phone.includes(customerSearchTerm)
  );

  const calculateTotals = () => {
    // Use shared calculation utility (matches backend logic)
    return calculateInvoiceTotals(invoiceItems, discount, taxType, cessRate, shopSettings);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation: Check if at least one item exists
    if (invoiceItems.length === 0) {
      toast.error('Please add at least one item to the invoice');
      return;
    }

    // Validation: product items need a product selected; service items need a name
    const emptyItemIndex = invoiceItems.findIndex(item =>
      item.itemType === 'service'
        ? (!item.serviceName || item.serviceName.trim() === '')
        : (!item.product || item.product === '')
    );
    if (emptyItemIndex !== -1) {
      const isService = invoiceItems[emptyItemIndex].itemType === 'service';
      toast.error(
        isService
          ? `Please enter a service name for item #${emptyItemIndex + 1}`
          : `Please select a product for item #${emptyItemIndex + 1}`
      );
      return;
    }

    // Validation: Check if all items have quantity > 0
    const zeroQuantityIndex = invoiceItems.findIndex(item => !item.quantity || item.quantity <= 0);
    if (zeroQuantityIndex !== -1) {
      toast.error(`Please enter quantity for item #${zeroQuantityIndex + 1}`);
      return;
    }

    // Validation: Check if quantity exceeds available stock
    const exceededStockIndex = invoiceItems.findIndex(item => {
      return item.availableQuantity && item.quantity > item.availableQuantity;
    });
    if (exceededStockIndex !== -1) {
      const item = invoiceItems[exceededStockIndex];
      toast.error(`Item #${exceededStockIndex + 1}: Quantity (${item.quantity}) exceeds available stock (${item.availableQuantity})`);
      return;
    }

    // Validation: Check if discount is valid
    const totals = calculateTotals();
    const discountValidation = validateDiscount(discount, totals.subtotal);
    if (!discountValidation.isValid) {
      toast.error(discountValidation.error);
      return;
    }

    // Validation: Check if invoice totals are valid
    const totalsValidation = validateInvoiceTotals(totals);
    if (!totalsValidation.isValid) {
      toast.error(totalsValidation.error);
      return;
    }
    if (totalsValidation.warning) {
      toast.warning(totalsValidation.warning);
    }

    setSubmitting(true);

    try {
      const totals = calculateTotals();

      const invoiceData = {
        customer: selectedCustomer?._id,
        customerName,
        customerPhone,
        customerAddress: selectedCustomer?.address,
        customerCity: selectedCustomer?.city,
        customerState: selectedCustomer?.state,
        customerGstin: selectedCustomer?.gstin,
        invoiceDate,
        items: invoiceItems,
        taxType,
        cessRate: taxType === 'CESS' ? cessRate : 0,
        discount,
        paymentStatus,
        paymentMethod,
        paidAmount: paymentStatus === 'PAID' ? totals.finalTotal : paidAmount,
        balanceAmount: paymentStatus === 'PAID' ? 0 : totals.finalTotal - paidAmount,
        paymentDetails,
        notes,
        // Ship To details (only include if enableShipTo is on and data exists)
        shipToName: shipTo.name || undefined,
        shipToAddress: shipTo.address || undefined,
        shipToCity: shipTo.city || undefined,
        shipToState: shipTo.state || undefined,
        shipToPincode: shipTo.pincode || undefined,
        // Transportation details
        transportMode: transport.mode,
        transportDocNumber: transport.docNumber,
        transportDocDate: transport.docDate || undefined,
        vehicleNumber: transport.vehicleNumber,
        approxDist: transport.approxDist ? Number(transport.approxDist) : undefined,
        pos: transport.pos,
        supplyDate: transport.supplyDate || undefined,
        transporterId: transport.transporterId,
        transporterName: transport.transporterName,
        // Purchase Order
        poNumber: po.poNumber,
        poDate: po.poDate || undefined,
        // Additional invoice details
        eWayBillNumber: additionalDetails.eWayBillNumber || undefined,
        deliveryNote: additionalDetails.deliveryNote || undefined,
        referenceNo: additionalDetails.referenceNo || undefined,
        otherReferences: additionalDetails.otherReferences || undefined,
        termsOfDelivery: additionalDetails.termsOfDelivery || undefined,
        destination: additionalDetails.destination || undefined,
      };

      const invoice = await invoicesAPI.create(invoiceData);

      // If this invoice was created from a quotation, update the quotation
      if (fromQuotationId) {
        try {
          await quotationsAPI.update(fromQuotationId, {
            convertedToInvoiceId: invoice._id,
            status: 'ACCEPTED'
          });
          toast.success('Invoice created & quotation updated!');
        } catch (updateError) {
          console.error('Failed to update quotation:', updateError);
          toast.success('Invoice created successfully!');
          // Don't block the flow - invoice is already created
        }
      }
      // If this invoice was created from a proforma invoice, update the proforma
      else if (fromProformaId) {
        try {
          await proformaInvoicesAPI.update(fromProformaId, {
            convertedToInvoiceId: invoice._id,
            status: 'ACCEPTED'
          });
          toast.success('Invoice created & proforma updated!');
        } catch (updateError) {
          console.error('Failed to update proforma:', updateError);
          toast.success('Invoice created successfully!');
          // Don't block the flow - invoice is already created
        }
      }
      // If this invoice was created from a delivery challan, update the challan
      else if (fromChallanId) {
        try {
          await deliveryChallansAPI.update(fromChallanId, {
            convertedToInvoiceId: invoice._id,
            status: 'ACCEPTED'
          });
          toast.success('Invoice created & challan updated!');
        } catch (updateError) {
          console.error('Failed to update challan:', updateError);
          toast.success('Invoice created successfully!');
          // Don't block the flow - invoice is already created
        }
      } else {
        toast.success('Invoice created successfully!');
      }

      invalidateInvoices();
      router.push(`/dashboard/invoices/${invoice._id}`);
    } catch (error) {
      // Show user-friendly error messages
      let errorMessage = 'Failed to create invoice';

      if (error.message) {
        // Convert technical errors to user-friendly messages
        if (error.message.includes('Cast to ObjectId failed') && error.message.includes('Product')) {
          errorMessage = 'Please select a valid product for all items';
        } else if (error.message.includes('validation failed')) {
          errorMessage = 'Please check all fields and try again';
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const totals = calculateTotals();

  if (loading || !user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create New Invoice</h1>
          <p className="mt-1 text-sm text-gray-600">Generate a new invoice for your customer</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-black">
          {/* ── Customer Details ─────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-black">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Customer Details</h2>

            {/* Customer selector row */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer (Optional)</label>
              <div className="flex gap-2">
                <div className="flex-1 relative customer-dropdown-container">
                  <div
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white cursor-pointer"
                    onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                  >
                    <div className="flex items-center justify-between">
                      <span className={selectedCustomer ? 'text-gray-900' : 'text-gray-500'}>
                        {selectedCustomer ? `${selectedCustomer.name} - ${selectedCustomer.phone}` : 'Cash Customer'}
                      </span>
                      {selectedCustomer && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleCustomerChange(''); }}
                          className="text-gray-400 hover:text-gray-600">
                          <HiX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {isCustomerDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
                      <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                          <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input type="text" placeholder="Search by name or phone..."
                            value={customerSearchTerm} onChange={(e) => setCustomerSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus />
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        <div onClick={() => handleCustomerChange('')}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-gray-700">Cash Customer</div>
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer) => (
                            <div key={customer._id} onClick={() => handleCustomerChange(customer._id)}
                              className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-t border-gray-100">
                              <div className="font-medium text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-500">{customer.phone}</div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">No customers found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => setShowCustomerModal(true)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1" title="Add New Customer">
                  <HiPlus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Bill To / Ship To columns */}
            <div className={`grid grid-cols-1 gap-6 ${shopSettings?.enableShipTo ? 'md:grid-cols-2' : ''}`}>

              {/* ── BILL TO ── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-5 bg-blue-500 rounded-full inline-block" />
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Bill To</h3>
                </div>
                <div className={`grid grid-cols-1 gap-3 ${!shopSettings?.enableShipTo ? 'md:grid-cols-2' : ''}`}>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Customer Name *</label>
                    <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-black" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                    <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-black" />
                  </div>
                  {selectedCustomer?.gstin && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">GSTIN</label>
                      <input type="text" readOnly value={selectedCustomer.gstin}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600" />
                    </div>
                  )}
                  {selectedCustomer?.address && (
                    <div className={selectedCustomer?.gstin ? '' : 'md:col-span-2'}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                      <textarea readOnly rows={2} value={[
                        selectedCustomer.address,
                        selectedCustomer.city,
                        selectedCustomer.state,
                        selectedCustomer.pincode,
                      ].filter(Boolean).join(', ')}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600 resize-none" />
                    </div>
                  )}
                </div>
              </div>

              {/* ── SHIP TO — only when enabled in Settings ── */}
              {shopSettings?.enableShipTo && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-5 bg-green-500 rounded-full inline-block" />
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Ship To</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">Optional</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Recipient Name</label>
                    <input type="text" placeholder="Same as Bill To" value={shipTo.name}
                      onChange={e => setShipTo(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-black" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                    <textarea rows={2} placeholder="Street / Area" value={shipTo.address}
                      onChange={e => setShipTo(p => ({ ...p, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-black resize-none" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[['city', 'City'], ['state', 'State'], ['pincode', 'Pincode']].map(([key, label]) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                        <input type="text" placeholder={label} value={shipTo[key]}
                          onChange={e => setShipTo(p => ({ ...p, [key]: e.target.value }))}
                          className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-xs text-black" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Invoice Date + Tax Type row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-5 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Date *</label>
                <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black" />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Type
                  {shopSettings?.gstScheme === 'COMPOSITION' && (
                    <span className="ml-2 text-xs font-normal text-orange-500">(Not applicable for Composition Scheme)</span>
                  )}
                </label>
                <select value={taxType} onChange={(e) => setTaxType(e.target.value)}
                  disabled={shopSettings?.gstScheme === 'COMPOSITION'}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black transition-all ${shopSettings?.gstScheme === 'COMPOSITION'
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                    : 'border-gray-300'
                    }`}>
                  <option value="CGST_SGST">CGST + SGST (Same State)</option>
                  <option value="IGST">IGST (Interstate)</option>
                  <option value="CESS">CESS (Manual Rate)</option>
                </select>
              </div>
              {taxType === 'CESS' && shopSettings?.gstScheme === 'REGULAR' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CESS Rate (%) *</label>
                  <input type="number" min="0" step="0.01" value={cessRate}
                    onChange={(e) => setCessRate(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="Enter CESS rate (e.g., 1 for 1%)" />
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Invoice Items</h2>
              <div className="flex items-center gap-2">
                {/* Add Product button — shown only when enableProduct is on */}
                {shopSettings?.enableProduct !== false && (
                  <button
                    type="button"
                    onClick={addProductItem}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <HiCube className="w-4 h-4" />
                    Add Product
                  </button>
                )}
                {/* Add Service button — shown only when enableService is on */}
                {shopSettings?.enableService && (
                  <button
                    type="button"
                    onClick={addServiceItem}
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                  >
                    <HiLightningBolt className="w-4 h-4" />
                    Add Service
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Column Headers */}
              {invoiceItems.length > 0 && (
                <div className="flex gap-4 px-4 text-xs font-semibold text-gray-600 uppercase text-black">
                  <div className="flex-1">Item</div>
                  <div className="w-20">Qty</div>
                  <div className="w-28">Price</div>
                  <div className="w-28">Discount (₹)</div>
                  {shopSettings?.gstScheme === 'REGULAR' && <div className="w-24">GST %</div>}
                  {shopSettings?.gstScheme === 'REGULAR' && <div className="w-24">CESS %</div>}
                  <div className="w-32">Total</div>
                  <div className="w-10"></div>
                </div>
              )}

              {invoiceItems.map((item, index) => {
                const bothEnabled = shopSettings?.enableProduct !== false && shopSettings?.enableService;
                const isService = item.itemType === 'service' || shopSettings?.enableProduct === false;

                return (
                  <div key={index} className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-200 gap-3">

                    {/* ── Type Switcher — only when BOTH Product & Service are enabled ── */}
                    {bothEnabled && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-medium mr-1">Type:</span>
                        <button
                          type="button"
                          onClick={() => { const u = [...invoiceItems]; u[index].itemType = 'product'; setInvoiceItems(u); }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${item.itemType !== 'service' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                          <HiCube className="w-3 h-3" /> Product
                        </button>
                        <button
                          type="button"
                          onClick={() => { const u = [...invoiceItems]; u[index].itemType = 'service'; setInvoiceItems(u); }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${item.itemType === 'service' ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                          <HiLightningBolt className="w-3 h-3" /> Service
                        </button>
                      </div>
                    )}

                    {/* ── Fields Row ── */}
                    <div className="flex gap-4 items-start">

                      {/* Item selector */}
                      <div className="flex-1">
                        {isService ? (
                          /* Service: combobox — type freely OR pick from saved list */
                          (() => {
                            const filtered = services.filter(s =>
                              s.name.toLowerCase().includes((item.serviceName || '').toLowerCase())
                            );
                            const showDrop = item._svcDropOpen && filtered.length > 0;
                            return (
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Type or pick a service…"
                                  value={item.serviceName || ''}
                                  onFocus={() => {
                                    const u = [...invoiceItems]; u[index]._svcDropOpen = true; setInvoiceItems(u);
                                  }}
                                  onBlur={() => setTimeout(() => {
                                    const u = [...invoiceItems]; u[index]._svcDropOpen = false; setInvoiceItems(u);
                                  }, 150)}
                                  onChange={(e) => {
                                    const u = [...invoiceItems];
                                    u[index].serviceName = e.target.value;
                                    u[index]._svcDropOpen = true;
                                    u[index].serviceId = '';
                                    setInvoiceItems(u);
                                  }}
                                  className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-black"
                                />
                                {showDrop && (
                                  <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border border-purple-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                                    {filtered.map(s => (
                                      <li
                                        key={s._id}
                                        onMouseDown={() => {
                                          const u = [...invoiceItems];
                                          u[index].serviceName = s.name;
                                          u[index].serviceId = s._id;
                                          u[index].sellingPrice = s.rate;
                                          u[index].gstRate = s.gstRate;
                                          u[index].sacCode = s.sacCode || '';
                                          u[index].unit = s.unit || 'NOS';
                                          u[index]._svcDropOpen = false;
                                          setInvoiceItems(u);
                                        }}
                                        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-purple-50 text-sm"
                                      >
                                        <span className="font-medium text-gray-800">{s.name}</span>
                                        <span className="text-xs text-gray-400 ml-2">₹{s.rate} · {s.gstRate}% GST</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          /* Product: batch dropdown */
                          <div className="w-full">
                            <select
                              value={item.selectedBatch || ''}
                              onChange={(e) => updateItem(index, 'product', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select Product</option>
                              {products.map((batch, batchIdx) => (
                                <option key={`${batch.productId}-${batch.batchId || 'no-batch'}-${batchIdx}`} value={JSON.stringify(batch)}>
                                  {batch.label}
                                </option>
                              ))}
                            </select>
                            {/* Display serial number dropdown or batch info below product name */}
                            {item.hasSerial && item.availableSerials ? (
                              // Show serial number dropdown for products with serials
                              <div className="mt-2">
                                <select
                                  value={item.serialNumber || ''}
                                  onChange={(e) => updateItem(index, 'serialNumber', e.target.value)}
                                  className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-green-50"
                                >
                                  <option value="">Select Serial Number</option>
                                  {item.availableSerials.map((serial) => (
                                    <option key={serial} value={serial}>
                                      {serial}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : item.selectedBatch && (() => {
                              // Show batch info for regular batch products
                              try {
                                const batch = JSON.parse(item.selectedBatch);
                                const showBatch = shopSettings?.invBatchNumber !== false;
                                const showExp = shopSettings?.invExpiryDate !== false;
                                return batch ? (
                                  <div className="mt-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md">
                                    <span className="text-xs font-medium text-blue-700">
                                      {batch.batchNo && showBatch && `Batch: ${batch.batchNo}`}
                                      {batch.expiryDate && showExp && (
                                        <span className={batch.batchNo && showBatch ? "ml-2 text-blue-600" : ""}>
                                          {batch.batchNo && showBatch ? '• ' : ''}Exp: {new Date(batch.expiryDate).toLocaleDateString('en-GB')}
                                        </span>
                                      )}
                                      <span className={(batch.batchNo && showBatch) || (batch.expiryDate && showExp) ? "ml-2 text-blue-600" : ""}>
                                        {((batch.batchNo && showBatch) || (batch.expiryDate && showExp)) ? '• ' : ''}Available: {batch.availableQuantity} {batch.unit}
                                      </span>
                                    </span>
                                  </div>
                                ) : null;
                              } catch (e) {
                                return null;
                              }
                            })()}
                          </div>
                        )}
                      </div>

                      <div className="w-20">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                          disabled={item.hasSerial} // Lock quantity to 1 for serial items
                          className={`w-full px-3 py-2 border rounded-lg text-sm ${item.hasSerial ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300'}`}
                        />
                      </div>

                      <div className="w-28">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={item.sellingPrice}
                          onChange={(e) => updateItem(index, 'sellingPrice', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>

                      {/* Discount (₹) */}
                      <div className="w-28">
                        <input
                          type="number"
                          min="0"
                          max={item.quantity * item.sellingPrice}
                          step="0.01"
                          placeholder="0.00"
                          value={item.discountAmount || 0}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            const maxDiscount = item.quantity * item.sellingPrice;
                            if (value > maxDiscount) {
                              toast.warning(`Discount cannot exceed item total of ₹${maxDiscount.toFixed(2)}`);
                              updateItem(index, 'discountAmount', maxDiscount);
                            } else {
                              updateItem(index, 'discountAmount', value);
                            }
                          }}
                          className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                          title="Item Discount (₹)"
                        />
                      </div>

                      {/* GST % — hidden for Composition Scheme */}
                      {shopSettings?.gstScheme === 'REGULAR' ? (
                        <div className="w-24">
                          <select
                            value={item.gstRate}
                            onChange={(e) => updateItem(index, 'gstRate', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value={0}>0%</option>
                            <option value={0.25}>0.25%</option>
                            <option value={3}>3%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                            <option value={40}>40%</option>
                          </select>
                        </div>
                      ) : null}

                      {/* CESS % — hidden for Composition Scheme */}
                      {shopSettings?.gstScheme === 'REGULAR' ? (
                        <div className="w-24">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={item.cessRate || 0}
                            onChange={(e) => updateItem(index, 'cessRate', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            title="CESS Rate (%)"
                          />
                        </div>
                      ) : null}

                      <div className="w-32 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium">
                        ₹{(() => {
                          const itemCalc = calculateItemWithDiscount(item, shopSettings);
                          return itemCalc.itemTotal.toFixed(2);
                        })()}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}

              {invoiceItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <div className="flex items-center gap-3 mb-3">
                    {shopSettings?.enableProduct !== false && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-600 border border-blue-200">
                        <HiCube className="w-3.5 h-3.5" /> Product
                      </span>
                    )}
                    {shopSettings?.enableProduct !== false && shopSettings?.enableService && (
                      <span className="text-gray-300">or</span>
                    )}
                    {shopSettings?.enableService && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-100 text-purple-600 border border-purple-200">
                        <HiLightningBolt className="w-3.5 h-3.5" /> Service
                      </span>
                    )}
                  </div>
                  <p className="text-sm">Use the buttons above to add items to the invoice</p>
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Discount:</span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={totals.subtotal}
                    step="0.01"
                    value={totals.hasItemDiscounts ? totals.totalDiscount : discount}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value > totals.subtotal) {
                        toast.error(`Discount cannot exceed subtotal of ₹${totals.subtotal.toFixed(2)}`);
                        setDiscount(totals.subtotal);
                      } else {
                        setDiscount(value);
                      }
                    }}
                    disabled={totals.hasItemDiscounts}
                    className={`w-32 px-3 py-1 border rounded-lg text-right ${totals.hasItemDiscounts ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                    placeholder="0.00"
                    title={totals.hasItemDiscounts ? 'Remove discount from products/services to add invoice-level discount' : 'Invoice-level discount'}
                  />
                  {totals.hasItemDiscounts && (
                    <div className="absolute -top-6 right-0 text-xs text-emerald-600 font-medium">
                      Item discounts applied
                    </div>
                  )}
                </div>
              </div>
              {taxType !== 'CESS' && totals.totalTax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {taxType === 'CGST_SGST' ? 'CGST + SGST' : 'IGST'}:
                  </span>
                  <span className="font-medium">₹{totals.totalTax.toFixed(2)}</span>
                </div>
              )}
              {totals.totalCess > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {taxType === 'CESS' ? `CESS (${cessRate}%)` : 'CESS'}:
                  </span>
                  <span className="font-medium">₹{totals.totalCess.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Round Off:</span>
                <span className="font-medium">₹{totals.roundOff.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between text-lg font-bold">
                  <span>Grand Total:</span>
                  <span className="text-blue-600">₹{totals.finalTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Status *
                </label>
                <select

                  value={paymentStatus}
                  onChange={(e) => {
                    setPaymentStatus(e.target.value);
                    if (e.target.value === 'PAID') {
                      setPaidAmount(totals.finalTotal);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="PAID">Paid</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="PARTIAL">Partial Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select

                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              {paymentStatus !== 'PAID' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paid Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={totals.finalTotal}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Balance: ₹{(totals.finalTotal - paidAmount).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Details / Reference
                </label>
                <input
                  type="text"
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., UPI Ref: 123456789"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
          </div>

          {/* ── Transportation Details Accordion — only shown when enableTransport is ON ── */}
          {shopSettings?.enableTransport && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() => setShowTransport((prev) => !prev)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900">Transportation Details</span>
                  <span className="text-xs text-gray-400 font-normal">(Optional — for E-Way Bill)</span>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showTransport ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Accordion Body */}
              {showTransport && (() => {
                // Map mode → doc number label + doc date label
                const docLabels = {
                  ROAD: { num: 'LR Number', date: 'LR Date' },
                  RAIL: { num: 'RR Number', date: 'RR Date' },
                  AIR: { num: 'AWB Number', date: 'AWB Date' },
                  SHIP_ROAD: { num: 'Loading Number', date: 'Loading Date' },
                };
                const labels = docLabels[transport.mode] || null;

                return (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

                      {/* Transportation Mode */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Transportation Mode</label>
                        <select
                          value={transport.mode}
                          onChange={(e) => setTransport({ ...transport, mode: e.target.value, docNumber: '', docDate: '' })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Mode</option>
                          <option value="NONE">None</option>
                          <option value="ROAD">Road</option>
                          <option value="RAIL">Rail</option>
                          <option value="AIR">Air</option>
                          <option value="SHIP_ROAD">Ship / Road</option>
                        </select>
                      </div>

                      {labels && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{labels.num}</label>
                          <input
                            type="text"
                            value={transport.docNumber}
                            onChange={(e) => setTransport({ ...transport, docNumber: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                            placeholder={`Enter ${labels.num}`}
                          />
                        </div>
                      )}

                      {labels && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{labels.date}</label>
                          <input
                            type="date"
                            value={transport.docDate}
                            onChange={(e) => setTransport({ ...transport, docDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                          />
                        </div>
                      )}

                      {!['AIR', 'RAIL'].includes(transport.mode) && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Number</label>
                          <input
                            type="text"
                            value={transport.vehicleNumber}
                            onChange={(e) => setTransport({ ...transport, vehicleNumber: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                            placeholder="e.g. MH12AB1234"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Approx Distance (KM)</label>
                        <input
                          type="number"
                          min="0"
                          value={transport.approxDist}
                          onChange={(e) => setTransport({ ...transport, approxDist: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                          placeholder="e.g. 250"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Place of Supply (POS)</label>
                        <input
                          type="text"
                          value={transport.pos}
                          onChange={(e) => setTransport({ ...transport, pos: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                          placeholder="e.g. Maharashtra"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date of Supply</label>
                        <input
                          type="date"
                          value={transport.supplyDate}
                          onChange={(e) => setTransport({ ...transport, supplyDate: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Transporter ID</label>
                        <input
                          type="text"
                          value={transport.transporterId}
                          onChange={(e) => setTransport({ ...transport, transporterId: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                          placeholder="e.g. 27AABCU9603R1Z1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Transporter Name</label>
                        <input
                          type="text"
                          value={transport.transporterName}
                          onChange={(e) => setTransport({ ...transport, transporterName: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                          placeholder="e.g. Fast Logistics Pvt Ltd"
                        />
                      </div>

                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Purchase Order Details Accordion — only shown when enablePurchaseOrders is ON ── */}
          {shopSettings?.enablePurchaseOrders && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPO((prev) => !prev)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900">Purchase Order Details</span>
                  <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showPO ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showPO && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

                    {/* PO Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">PO Number</label>
                      <input
                        type="text"
                        value={po.poNumber}
                        onChange={(e) => setPo({ ...po, poNumber: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        placeholder="e.g. PO-2024-001"
                      />
                    </div>

                    {/* PO Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">PO Date</label>
                      <input
                        type="date"
                        value={po.poDate}
                        onChange={(e) => setPo({ ...po, poDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      />
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Additional Invoice Details — only shown when enableAdditionalDetails is ON ── */}
          {shopSettings?.enableAdditionalDetails && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdditional((prev) => !prev)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900">Additional Invoice Details</span>
                  <span className="text-xs text-gray-400 font-normal">(Optional — for Tally / E-Way Bill)</span>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showAdditional ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAdditional && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

                    {/* E-Way Bill Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">E-Way Bill Number</label>
                      <input
                        type="text"
                        value={additionalDetails.eWayBillNumber}
                        onChange={(e) => setAdditionalDetails({ ...additionalDetails, eWayBillNumber: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        placeholder="e.g. 331004XXXXXXXXXX"
                      />
                    </div>

                    {/* Delivery Note */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Note</label>
                      <input
                        type="text"
                        value={additionalDetails.deliveryNote}
                        onChange={(e) => setAdditionalDetails({ ...additionalDetails, deliveryNote: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        placeholder="e.g. DN-001"
                      />
                    </div>

                    {/* Reference No. & Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reference No. &amp; Date</label>
                      <input
                        type="text"
                        value={additionalDetails.referenceNo}
                        onChange={(e) => setAdditionalDetails({ ...additionalDetails, referenceNo: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        placeholder="e.g. REF-2024-001"
                      />
                    </div>

                    {/* Other References */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Other References</label>
                      <input
                        type="text"
                        value={additionalDetails.otherReferences}
                        onChange={(e) => setAdditionalDetails({ ...additionalDetails, otherReferences: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        placeholder="Any other reference"
                      />
                    </div>

                    {/* Terms of Delivery */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Terms of Delivery</label>
                      <input
                        type="text"
                        value={additionalDetails.termsOfDelivery}
                        onChange={(e) => setAdditionalDetails({ ...additionalDetails, termsOfDelivery: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        placeholder="e.g. Ex-Works, CIF, FOB"
                      />
                    </div>

                    {/* Destination */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                      <input
                        type="text"
                        value={additionalDetails.destination}
                        onChange={(e) => setAdditionalDetails({ ...additionalDetails, destination: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        placeholder="e.g. Mumbai, Maharashtra"
                      />
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}


          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || invoiceItems.length === 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating Invoice...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>

      {/* New Customer Modal */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => {
          setShowCustomerModal(false);
          setCustomerFormErrors({});
        }}
        title="Add New Customer"
        size="max-w-2xl"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={customerFormData.name}
                onChange={handleCustomerFormChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 ${customerFormErrors.name
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
                  : 'border-gray-300 focus:ring-emerald-500'
                  }`}
              />
              {customerFormErrors.name && (
                <p className="text-sm text-red-600 flex items-center mt-1">
                  <HiExclamation className="w-4 h-4 mr-1" />
                  {customerFormErrors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={customerFormData.phone}
                onChange={handleCustomerFormChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 ${customerFormErrors.phone
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
                  : 'border-gray-300 focus:ring-emerald-500'
                  }`}
              />
              {customerFormErrors.phone && (
                <p className="text-sm text-red-600 flex items-center mt-1">
                  <HiExclamation className="w-4 h-4 mr-1" />
                  {customerFormErrors.phone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={customerFormData.email}
                onChange={handleCustomerFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GSTIN
              </label>
              <input
                type="text"
                name="gstin"
                value={customerFormData.gstin}
                onChange={handleCustomerFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 uppercase"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={customerFormData.address}
                onChange={handleCustomerFormChange}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={customerFormData.city}
                onChange={handleCustomerFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <select
                name="state"
                value={customerFormData.state}
                onChange={handleCustomerFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select State</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                <option value="Assam">Assam</option>
                <option value="Bihar">Bihar</option>
                <option value="Chhattisgarh">Chhattisgarh</option>
                <option value="Goa">Goa</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Haryana">Haryana</option>
                <option value="Himachal Pradesh">Himachal Pradesh</option>
                <option value="Jharkhand">Jharkhand</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Kerala">Kerala</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Manipur">Manipur</option>
                <option value="Meghalaya">Meghalaya</option>
                <option value="Mizoram">Mizoram</option>
                <option value="Nagaland">Nagaland</option>
                <option value="Odisha">Odisha</option>
                <option value="Punjab">Punjab</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Sikkim">Sikkim</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Telangana">Telangana</option>
                <option value="Tripura">Tripura</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Uttarakhand">Uttarakhand</option>
                <option value="West Bengal">West Bengal</option>
                <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                <option value="Chandigarh">Chandigarh</option>
                <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                <option value="Delhi">Delhi</option>
                <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                <option value="Ladakh">Ladakh</option>
                <option value="Lakshadweep">Lakshadweep</option>
                <option value="Puducherry">Puducherry</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pincode
              </label>
              <input
                type="text"
                name="pincode"
                value={customerFormData.pincode}
                onChange={handleCustomerFormChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setShowCustomerModal(false);
                setCustomerFormErrors({});
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingCustomer}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {savingCustomer ? 'Saving...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

export default function NewInvoice() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <NewInvoiceContent />
    </Suspense>
  );
}
