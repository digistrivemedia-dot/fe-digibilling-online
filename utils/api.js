const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api`;

export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Check if response is JSON before parsing
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  let data;
  if (isJson) {
    data = await response.json();
  } else {
    // If not JSON, read as text (likely HTML error page)
    const text = await response.text();
    data = { message: `Server error: ${response.status} ${response.statusText}` };
    console.error('Non-JSON response:', text.substring(0, 200));
  }

  if (!response.ok) {
    // Auto-logout on 401 (expired / invalid token)
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};

export const authAPI = {
  login: (credentials) => apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  signup: (userData) => apiCall('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(userData),
    headers: {
      'x-signup-key': process.env.NEXT_PUBLIC_SIGNUP_KEY || ''
    }
  }),
};

export const shopAPI = {
  get: () => apiCall('/shop', {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }),
  update: (data) => apiCall('/shop', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

export const productsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/products?${query}`);
  },
  getAllWithBatches: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/products/with-batches?${query}`);
  },
  getBatchesForInvoice: () => apiCall('/products/batches-for-invoice'),
  getForPurchase: () => apiCall('/products/for-purchase'),
  getOne: (id) => apiCall(`/products/${id}`),
  create: (data) => apiCall('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/products/${id}`, {
    method: 'DELETE',
  }),
  syncStock: () => apiCall('/products/sync-stock', { method: 'POST' }),
};

export const customersAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/customers?${query}`);
  },
  getOne: (id) => apiCall(`/customers/${id}`),
  create: (data) => apiCall('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/customers/${id}`, {
    method: 'DELETE',
  }),
};

export const invoicesAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/invoices?${query}`);
  },
  getStats: () => apiCall('/invoices/stats'),
  getOne: (id) => apiCall(`/invoices/${id}`),
  create: (data) => apiCall('/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  updatePayment: (id, data) => apiCall(`/invoices/${id}/payment`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/invoices/${id}`, {
    method: 'DELETE',
  }),
  // Multiple payments
  addPayment: (id, data) => apiCall(`/invoices/${id}/payments`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  editPayment: (id, paymentId, data) => apiCall(`/invoices/${id}/payments/${paymentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deletePayment: (id, paymentId) => apiCall(`/invoices/${id}/payments/${paymentId}`, {
    method: 'DELETE',
  }),
};

// Suppliers API
export const suppliersAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/suppliers?${query}`);
  },
  getStats: () => apiCall('/suppliers/stats'),
  getOne: (id) => apiCall(`/suppliers/${id}`),
  getLedger: (id, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/suppliers/${id}/ledger?${query}`);
  },
  create: (data) => apiCall('/suppliers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/suppliers/${id}`, {
    method: 'DELETE',
  }),
};

// Purchases API
export const purchasesAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/purchases?${query}`);
  },
  getStats: () => apiCall('/purchases/stats'),
  getOne: (id) => apiCall(`/purchases/${id}`),
  create: (data) => apiCall('/purchases', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/purchases/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  updatePayment: (id, data) => apiCall(`/purchases/${id}/payment`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/purchases/${id}`, {
    method: 'DELETE',
  }),
  // Multiple payments
  addPayment: (id, data) => apiCall(`/purchases/${id}/payments`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  editPayment: (id, paymentId, data) => apiCall(`/purchases/${id}/payments/${paymentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deletePayment: (id, paymentId) => apiCall(`/purchases/${id}/payments/${paymentId}`, {
    method: 'DELETE',
  }),
};

// Purchase Returns API
export const purchaseReturnsAPI = {
  getStats: () => apiCall('/purchase-returns/stats'),
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/purchase-returns?${query}`);
  },
  getOne: (id) => apiCall(`/purchase-returns/${id}`),
  create: (data) => apiCall('/purchase-returns', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Sales Returns API
export const salesReturnsAPI = {
  getStats: () => apiCall('/sales-returns/stats'),
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/sales-returns?${query}`);
  },
  getOne: (id) => apiCall(`/sales-returns/${id}`),
  create: (data) => apiCall('/sales-returns', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateRefund: (id, data) => apiCall(`/sales-returns/${id}/refund`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

// Expenses API
export const expensesAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/expenses?${query}`);
  },
  getStats: () => apiCall('/expenses/stats'),
  getOne: (id) => apiCall(`/expenses/${id}`),
  create: (data) => apiCall('/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/expenses/${id}`, {
    method: 'DELETE',
  }),
};

// Payments API
export const paymentsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/payments?${query}`);
  },
  getStats: () => apiCall('/payments/stats'),
  getOne: (id) => apiCall(`/payments/${id}`),
  create: (data) => apiCall('/payments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Inventory API
export const inventoryAPI = {
  getAllBatches: () => apiCall('/inventory/batches'),
  getBatchesByProduct: (productId) => apiCall(`/inventory/batches/product/${productId}`),
  getBatch: (id) => apiCall(`/inventory/batches/${id}`),
  updateBatch: (id, data) => apiCall(`/inventory/batches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  toggleBatchActive: (id) => apiCall(`/inventory/batches/${id}/toggle-active`, {
    method: 'PUT',
  }),
  deleteBatch: (id) => apiCall(`/inventory/batches/${id}`, {
    method: 'DELETE',
  }),
  getNearExpiry: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/inventory/alerts/near-expiry?${query}`);
  },
  getExpired: () => apiCall('/inventory/alerts/expired'),
  getLowStock: () => apiCall('/inventory/alerts/low-stock'),
  getStats: () => apiCall('/inventory/stats'),
  getValuation: () => apiCall('/inventory/valuation'),
  getTopSelling: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/inventory/top-selling?${query}`);
  },
  getAdjustments: () => apiCall('/inventory/adjustments'),
  createAdjustment: (data) => apiCall('/inventory/adjustments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Reports API
export const reportsAPI = {
  // GSTR-1
  getGSTR1: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/reports/gstr1?${query}`);
  },
  downloadGSTR1: (params = {}) => {
    const token = localStorage.getItem('token');
    const query = new URLSearchParams(params).toString();
    window.open(`${API_URL}/reports/gstr1?${query}&token=${token}`, '_blank');
  },

  // GSTR-3B
  getGSTR3B: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/reports/gstr3b?${query}`);
  },

  // Tax Summary
  getTaxSummary: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/reports/tax-summary?${query}`);
  },

  // HSN Summary
  getHSNSummary: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/reports/hsn-summary?${query}`);
  },

  // P&L
  getProfitLoss: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/reports/profit-loss?${query}`);
  },

  // Balance Sheet
  getBalanceSheet: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/reports/balance-sheet?${query}`);
  },

  // E-Way Bill
  getEWayBill: (invoiceId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/reports/eway-bill/${invoiceId}?${query}`);
  },
  getEWayBillBulk: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/reports/eway-bill-bulk?${query}`);
  },

  // Ledger
  getLedger: (account, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/reports/ledger/${account}?${query}`);
  },

  // Trial Balance
  getTrialBalance: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/reports/trial-balance?${query}`);
  },

  // Summary
  getSummary: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/reports/summary?${query}`);
  },

  // Credit Notes (for GSTR-1 CDNR/CDNUR)
  getCreditNotes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/sales-returns?${query}`);
  },
};

// Quotations API
export const quotationsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/quotations?${query}`);
  },
  getStats: () => apiCall('/quotations/stats'),
  getOne: (id) => apiCall(`/quotations/${id}`),
  create: (data) => apiCall('/quotations', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/quotations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/quotations/${id}`, {
    method: 'DELETE',
  }),
  convertToInvoice: (id) => apiCall(`/quotations/${id}/convert`, {
    method: 'POST',
  }),
};

// Services API
export const servicesAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/services?${query}`);
  },
  getOne: (id) => apiCall(`/services/${id}`),
  create: (data) => apiCall('/services', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/services/${id}`, {
    method: 'DELETE',
  }),
};

// Proforma Invoices API
export const proformaInvoicesAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/proforma-invoices?${query}`);
  },
  getOne: (id) => apiCall(`/proforma-invoices/${id}`),
  create: (data) => apiCall('/proforma-invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/proforma-invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/proforma-invoices/${id}`, {
    method: 'DELETE',
  }),
  convertToInvoice: (id) => apiCall(`/proforma-invoices/${id}/convert`, {
    method: 'POST',
  }),
};

// Delivery Challans API
export const deliveryChallansAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/delivery-challans?${query}`);
  },
  getOne: (id) => apiCall(`/delivery-challans/${id}`),
  create: (data) => apiCall('/delivery-challans', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/delivery-challans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/delivery-challans/${id}`, {
    method: 'DELETE',
  }),
};

