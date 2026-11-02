/**
 * Frontend API client for Mahadev Mechanical Car Garage
 * Covers Public APIs, CSRF double-submit protection, and Admin Operational APIs
 */

const rawApiUrl = import.meta.env.VITE_API_URL 
  ? String(import.meta.env.VITE_API_URL).trim().replace(/\/+$/, '') 
  : '';

export const API_BASE = rawApiUrl
  ? (rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl}/api/v1`)
  : '/api/v1';

// In-memory CSRF token store
let inMemoryCsrfToken = null;

export function setCsrfToken(token) {
  inMemoryCsrfToken = token;
}

export function getCsrfToken() {
  if (inMemoryCsrfToken) return inMemoryCsrfToken;
  // Fallback: read from document.cookie if available
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp('(^|;\\s*)mahadev_csrf_token=([^;]*)'));
    if (match) {
      return decodeURIComponent(match[2]);
    }
  }
  return null;
}

/**
 * Generates a standard RFC 4122 UUIDv4 string.
 */
export function generateUUIDv4() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Common authenticated fetch wrapper for admin requests.
 * Automatically includes credentials (for HTTP-only cookies) and X-CSRF-Token on mutations.
 */
export async function adminFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const method = (options.method || 'GET').toUpperCase();
  
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  };

  // Attach Content-Type if body is present and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Double-submit CSRF protection on state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = getCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'include' // Always send HTTP-only auth cookies
  });

  const json = await response.json().catch(() => ({
    success: false,
    error: { code: 'NETWORK_ERROR', message: 'Failed to parse response from server.' }
  }));

  if (!response.ok) {
    const err = new Error(json.error?.message || `Request failed with status ${response.status}`);
    err.code = json.error?.code || 'REQUEST_FAILED';
    err.status = response.status;
    err.details = json.error;
    throw err;
  }

  return json;
}

// ==========================================
// PUBLIC API METHODS
// ==========================================

export async function bookPublicAppointment(payload, idempotencyKey) {
  const url = `${API_BASE}/public/appointments`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify(payload)
  });

  const json = await response.json().catch(() => ({
    success: false,
    error: { code: 'NETWORK_ERROR', message: 'Failed to parse server response.' }
  }));

  if (!response.ok) {
    const errorMsg = json.error?.message || `Booking failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.code = json.error?.code || 'BOOKING_FAILED';
    err.status = response.status;
    err.details = json.error;
    throw err;
  }

  return json;
}

export async function submitPublicEnquiry(payload, idempotencyKey) {
  const url = `${API_BASE}/public/enquiries`;
  const headers = {
    'Content-Type': 'application/json'
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const json = await response.json().catch(() => ({
    success: false,
    error: { code: 'NETWORK_ERROR', message: 'Failed to parse server response.' }
  }));

  if (!response.ok) {
    const errorMsg = json.error?.message || `Enquiry failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.code = json.error?.code || 'ENQUIRY_FAILED';
    err.status = response.status;
    err.details = json.error;
    throw err;
  }

  return json;
}

export async function fetchPublicServices() {
  const url = `${API_BASE}/public/services`;
  const response = await fetch(url);
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error?.message || 'Failed to fetch services.');
  }
  return json.data || [];
}

// ==========================================
// ADMIN AUTHENTICATION APIS
// ==========================================

export async function adminLogin(email, password) {
  const json = await adminFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (json.data?.csrfToken) {
    setCsrfToken(json.data.csrfToken);
  }
  return json.data;
}

export async function adminGetMe() {
  const json = await adminFetch('/auth/me', { method: 'GET' });
  if (json.data?.csrfToken) {
    setCsrfToken(json.data.csrfToken);
  }
  return json.data?.user;
}

export async function adminLogout() {
  try {
    await adminFetch('/auth/logout', { method: 'POST' });
  } finally {
    setCsrfToken(null);
  }
}

export async function adminChangePassword(currentPassword, newPassword) {
  return adminFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

// ==========================================
// DASHBOARD STATS APIS
// ==========================================

export async function fetchDashboardStats() {
  const res = await adminFetch('/admin/dashboard/stats');
  return res.data;
}

// ==========================================
// APPOINTMENTS OPERATIONAL APIS
// ==========================================

export async function fetchAppointments(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);

  const qs = query.toString();
  return adminFetch(`/admin/appointments${qs ? `?${qs}` : ''}`);
}

export async function fetchAppointmentById(id) {
  const res = await adminFetch(`/admin/appointments/${id}`);
  return res.data;
}

export async function updateAppointmentStatus(id, { status, reason, adminNotes }) {
  return adminFetch(`/admin/appointments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason, adminNotes })
  });
}

// ==========================================
// ENQUIRIES OPERATIONAL APIS
// ==========================================

export async function fetchEnquiries(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);

  const qs = query.toString();
  return adminFetch(`/admin/enquiries${qs ? `?${qs}` : ''}`);
}

export async function fetchEnquiryById(id) {
  const res = await adminFetch(`/admin/enquiries/${id}`);
  return res.data;
}

export async function updateEnquiryStatus(id, { status, resolutionNotes, assignedTo }) {
  return adminFetch(`/admin/enquiries/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, resolutionNotes, assignedTo })
  });
}

// ==========================================
// CUSTOMER MANAGEMENT APIS
// ==========================================

export async function fetchCustomers(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.search) query.set('search', params.search);

  const qs = query.toString();
  return adminFetch(`/admin/customers${qs ? `?${qs}` : ''}`);
}

export async function fetchCustomerById(id) {
  const res = await adminFetch(`/admin/customers/${id}`);
  return res.data;
}

export async function updateCustomer(id, data) {
  return adminFetch(`/admin/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

// ==========================================
// VEHICLE MANAGEMENT APIS
// ==========================================

export async function fetchVehicles(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.search) query.set('search', params.search);
  if (params.customerId) query.set('customerId', params.customerId);
  if (params.isProvisional !== undefined) query.set('isProvisional', params.isProvisional);

  const qs = query.toString();
  return adminFetch(`/admin/vehicles${qs ? `?${qs}` : ''}`);
}

export async function fetchVehicleById(id) {
  const res = await adminFetch(`/admin/vehicles/${id}`);
  return res.data;
}

export async function updateVehicle(id, data) {
  return adminFetch(`/admin/vehicles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function transferVehicleOwner(id, { customerId, confirmOwnershipTransfer, transferReason }) {
  return adminFetch(`/admin/vehicles/${id}/transfer-owner`, {
    method: 'POST',
    body: JSON.stringify({ customerId, confirmOwnershipTransfer, transferReason })
  });
}

// ==========================================
// SERVICE MANAGEMENT APIS
// ==========================================

export async function fetchAdminServices() {
  const res = await adminFetch('/admin/services');
  return res.data || [];
}

export async function createAdminService(data) {
  return adminFetch('/admin/services', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateAdminService(id, data) {
  return adminFetch(`/admin/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function toggleAdminService(id) {
  return adminFetch(`/admin/services/${id}/toggle`, {
    method: 'PATCH'
  });
}

// ==========================================
// GALLERY MANAGEMENT APIS
// ==========================================

export async function fetchAdminGallery() {
  const res = await adminFetch('/admin/gallery');
  return res.data || [];
}

export async function createAdminGallery(data) {
  return adminFetch('/admin/gallery', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateAdminGallery(id, data) {
  return adminFetch(`/admin/gallery/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteAdminGallery(id) {
  return adminFetch(`/admin/gallery/${id}`, {
    method: 'DELETE'
  });
}

// ==========================================
// REVIEW MANAGEMENT APIS
// ==========================================

export async function fetchAdminReviews() {
  const res = await adminFetch('/admin/reviews');
  return res.data || [];
}

export async function createAdminReview(data) {
  return adminFetch('/admin/reviews', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateAdminReview(id, data) {
  return adminFetch(`/admin/reviews/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function toggleAdminReview(id, field = 'isActive') {
  return adminFetch(`/admin/reviews/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ field })
  });
}

export async function deleteAdminReview(id) {
  return adminFetch(`/admin/reviews/${id}`, {
    method: 'DELETE'
  });
}

// ==========================================
// BUSINESS SETTINGS APIS
// ==========================================

export async function fetchBusinessSettings() {
  const res = await adminFetch('/admin/settings');
  return res.data;
}

export async function updateBusinessSettings(data) {
  return adminFetch('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// ==========================================
// SUPER_ADMIN USER MANAGEMENT (OWNER ONLY)
// ==========================================

export async function fetchSuperAdmins() {
  const res = await adminFetch('/admin/users');
  return res.data || [];
}

export async function createSuperAdmin(data) {
  return adminFetch('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateSuperAdmin(id, data) {
  return adminFetch(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function toggleSuperAdminStatus(id) {
  return adminFetch(`/admin/users/${id}/status`, {
    method: 'PATCH'
  });
}

export async function resetSuperAdminPassword(id, newPassword) {
  return adminFetch(`/admin/users/${id}/reset-password`, {
    method: 'PUT',
    body: JSON.stringify({ newPassword })
  });
}

// ==========================================
// AUDIT LOGS APIS (OWNER ONLY)
// ==========================================

export async function fetchAuditLogs(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.action) query.set('action', params.action);
  if (params.entityType) query.set('entityType', params.entityType);
  if (params.actorRole) query.set('actorRole', params.actorRole);

  const qs = query.toString();
  return adminFetch(`/admin/audit-logs${qs ? `?${qs}` : ''}`);
}

// ==========================================
// JOB CARDS & WORKSHOP OPERATIONS (PHASE 5)
// ==========================================

export async function fetchJobCards(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  if (params.customerId) query.set('customerId', params.customerId);
  if (params.vehicleId) query.set('vehicleId', params.vehicleId);

  const qs = query.toString();
  return adminFetch(`/admin/job-cards${qs ? `?${qs}` : ''}`);
}

export async function fetchJobCardById(id) {
  const res = await adminFetch(`/admin/job-cards/${id}`);
  return res.data;
}

export async function createJobCard(data) {
  return adminFetch('/admin/job-cards', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateJobCard(id, data) {
  return adminFetch(`/admin/job-cards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function updateJobCardStatus(id, { status, notes }) {
  return adminFetch(`/admin/job-cards/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes })
  });
}

export async function fetchJobCardByAppointmentId(appointmentId) {
  try {
    const res = await adminFetch(`/admin/appointments/${appointmentId}/job-card`);
    return res.data;
  } catch (err) {
    if (err.status === 404 || err.code === 'JOB_CARD_NOT_FOUND') {
      return null;
    }
    throw err;
  }
}

// ==========================================
// SERVICE ESTIMATES & CUSTOMER APPROVAL (PHASE 6)
// ==========================================

export async function fetchEstimatesForJobCard(jobCardId) {
  const res = await adminFetch(`/job-cards/${jobCardId}/estimates`);
  return res.data;
}

export async function createEstimateForJobCard(jobCardId, estimateData) {
  return adminFetch(`/job-cards/${jobCardId}/estimates`, {
    method: 'POST',
    body: JSON.stringify(estimateData)
  });
}

export async function fetchEstimateById(estimateId) {
  const res = await adminFetch(`/estimates/${estimateId}`);
  return res.data;
}

export async function sendEstimate(estimateId, { expiresAt } = {}) {
  return adminFetch(`/estimates/${estimateId}/send`, {
    method: 'POST',
    body: JSON.stringify({ expiresAt })
  });
}

export async function reviseEstimate(estimateId, revisionData) {
  return adminFetch(`/estimates/${estimateId}/revise`, {
    method: 'POST',
    body: JSON.stringify(revisionData)
  });
}

export async function recordEstimateDecision(estimateId, { decision, approvalSource, customerComment, approvedItemIndices }) {
  return adminFetch(`/estimates/${estimateId}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision, approvalSource, customerComment, approvedItemIndices })
  });
}

export async function recordNoEstimateException(id, { reason }) {
  return adminFetch(`/estimates/${id}/record-exception`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

// ==========================================
// BILLING, INVOICES & DIGITAL CUSTOMER KHATTA (PHASE 7)
// ==========================================

export async function fetchInvoices(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.search) query.set('search', params.search);
  if (params.paymentStatus) query.set('paymentStatus', params.paymentStatus);
  if (params.invoiceStatus) query.set('invoiceStatus', params.invoiceStatus);
  if (params.customerId) query.set('customerId', params.customerId);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);

  const qs = query.toString();
  return adminFetch(`/invoices${qs ? `?${qs}` : ''}`);
}

export async function fetchInvoiceById(id) {
  const res = await adminFetch(`/invoices/${id}`);
  return res.data;
}

export async function createInvoice(data) {
  return adminFetch('/invoices', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateInvoice(id, data) {
  return adminFetch(`/invoices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function issueInvoice(id) {
  return adminFetch(`/invoices/${id}/issue`, {
    method: 'POST'
  });
}

export async function cancelInvoice(id, { cancellationReason }) {
  return adminFetch(`/invoices/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ cancellationReason })
  });
}

export async function fetchInvoicePayments(invoiceId) {
  const res = await adminFetch(`/invoices/${invoiceId}/payments`);
  return res.data;
}

export async function recordPayment(invoiceId, paymentData) {
  return adminFetch(`/invoices/${invoiceId}/payments`, {
    method: 'POST',
    body: JSON.stringify(paymentData)
  });
}

export async function reversePayment(paymentId, { reversalReason }) {
  return adminFetch(`/payments/${paymentId}/reverse`, {
    method: 'POST',
    body: JSON.stringify({ reversalReason })
  });
}

export async function fetchCustomerLedger(customerId, params = {}) {
  const query = new URLSearchParams();
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  if (params.timeRange) query.set('timeRange', params.timeRange);

  const qs = query.toString();
  const res = await adminFetch(`/customers/${customerId}/ledger${qs ? `?${qs}` : ''}`);
  return res.data;
}

export async function fetchCustomerLedgerSummary(customerId) {
  const res = await adminFetch(`/customers/${customerId}/ledger/summary`);
  return res.data;
}

export async function recordCustomerLedgerAdjustment(customerId, adjustmentData) {
  return adminFetch(`/customers/${customerId}/ledger/adjustments`, {
    method: 'POST',
    body: JSON.stringify(adjustmentData)
  });
}

export async function fetchOutstandingDues(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  const qs = query.toString();
  return adminFetch(`/billing/outstanding${qs ? `?${qs}` : ''}`);
}

export async function fetchBillingStats() {
  const res = await adminFetch('/billing/stats');
  return res.data;
}

// ==========================================
// EXPENSE MANAGEMENT (PHASE 8)
// ==========================================

export async function fetchExpenses(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.category) query.set('category', params.category);
  if (params.paymentMethod) query.set('paymentMethod', params.paymentMethod);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.supplierId) query.set('supplierId', params.supplierId);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);

  const qs = query.toString();
  return adminFetch(`/expenses${qs ? `?${qs}` : ''}`);
}

export async function fetchExpenseStats() {
  const res = await adminFetch('/expenses/stats');
  return res.data;
}

export async function fetchExpenseById(id) {
  const res = await adminFetch(`/expenses/${id}`);
  return res.data;
}

export async function createExpense(data) {
  return adminFetch('/expenses', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function reverseExpense(id, { reversalReason }) {
  return adminFetch(`/expenses/${id}/reverse`, {
    method: 'POST',
    body: JSON.stringify({ reversalReason })
  });
}

// ==========================================
// SUPPLIER MANAGEMENT & PURCHASES (PHASE 8)
// ==========================================

export async function fetchSuppliers(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.isActive !== undefined && params.isActive !== '') query.set('isActive', params.isActive);

  const qs = query.toString();
  return adminFetch(`/suppliers${qs ? `?${qs}` : ''}`);
}

export async function createSupplier(data) {
  return adminFetch('/suppliers', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function fetchSupplierById(id) {
  const res = await adminFetch(`/suppliers/${id}`);
  return res.data;
}

export async function updateSupplier(id, data) {
  return adminFetch(`/suppliers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function toggleSupplierStatus(id) {
  return adminFetch(`/suppliers/${id}/status`, {
    method: 'PATCH'
  });
}

// Supplier Purchases
export async function fetchSupplierPurchases(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.supplierId) query.set('supplierId', params.supplierId);
  if (params.paymentStatus) query.set('paymentStatus', params.paymentStatus);
  if (params.purchaseStatus) query.set('purchaseStatus', params.purchaseStatus);
  if (params.search) query.set('search', params.search);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);

  const qs = query.toString();
  return adminFetch(`/supplier-purchases${qs ? `?${qs}` : ''}`);
}

export async function createSupplierPurchase(data) {
  return adminFetch('/supplier-purchases', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function fetchSupplierPurchaseById(id) {
  const res = await adminFetch(`/supplier-purchases/${id}`);
  return res.data;
}

export async function recordDraftPurchase(id) {
  return adminFetch(`/supplier-purchases/${id}/record`, {
    method: 'POST'
  });
}

export async function cancelSupplierPurchase(id, { cancellationReason }) {
  return adminFetch(`/supplier-purchases/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ cancellationReason })
  });
}

// Supplier Payments
export async function fetchSupplierPayments(supplierId, params = {}) {
  const query = new URLSearchParams();
  if (params.purchaseId) query.set('purchaseId', params.purchaseId);
  if (params.status) query.set('status', params.status);

  const qs = query.toString();
  const res = await adminFetch(`/suppliers/${supplierId}/payments${qs ? `?${qs}` : ''}`);
  return res.data;
}

export async function recordSupplierPayment(supplierId, paymentData) {
  return adminFetch(`/suppliers/${supplierId}/payments`, {
    method: 'POST',
    body: JSON.stringify(paymentData)
  });
}

export async function reverseSupplierPayment(paymentId, { reversalReason }) {
  return adminFetch(`/supplier-payments/${paymentId}/reverse`, {
    method: 'POST',
    body: JSON.stringify({ reversalReason })
  });
}

// Digital Supplier Khatta / Ledger
export async function fetchSupplierLedger(supplierId, params = {}) {
  const query = new URLSearchParams();
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  if (params.entryType) query.set('entryType', params.entryType);

  const qs = query.toString();
  const res = await adminFetch(`/suppliers/${supplierId}/ledger${qs ? `?${qs}` : ''}`);
  return res.data;
}

export async function fetchSupplierLedgerSummary(supplierId) {
  const res = await adminFetch(`/suppliers/${supplierId}/ledger/summary`);
  return res.data;
}

export async function recordSupplierLedgerAdjustment(supplierId, data) {
  return adminFetch(`/suppliers/${supplierId}/ledger/adjustments`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// ==========================================
// PHASE 9: BUSINESS ANALYTICS & REPORTS APIS
// ==========================================

function buildAnalyticsQueryString(params = {}) {
  const query = new URLSearchParams();
  if (params.preset) query.set('preset', params.preset);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  if (params.paymentStatus) query.set('paymentStatus', params.paymentStatus);
  if (params.category) query.set('category', params.category);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchAnalyticsOverview(params = {}) {
  const qs = buildAnalyticsQueryString(params);
  const res = await adminFetch(`/analytics/overview${qs}`);
  return res.data;
}

export async function fetchFinancialSummary(params = {}) {
  const qs = buildAnalyticsQueryString(params);
  const res = await adminFetch(`/analytics/financial-summary${qs}`);
  return res.data;
}

export async function fetchRevenueReport(params = {}) {
  const qs = buildAnalyticsQueryString(params);
  const res = await adminFetch(`/analytics/revenue${qs}`);
  return res.data;
}

export async function fetchCollectionsReport(params = {}) {
  const qs = buildAnalyticsQueryString(params);
  const res = await adminFetch(`/analytics/collections${qs}`);
  return res.data;
}

export async function fetchExpenseAnalytics(params = {}) {
  const qs = buildAnalyticsQueryString(params);
  const res = await adminFetch(`/analytics/expenses${qs}`);
  return res.data;
}

export async function fetchSupplierAnalytics(params = {}) {
  const qs = buildAnalyticsQueryString(params);
  const res = await adminFetch(`/analytics/suppliers${qs}`);
  return res.data;
}

export async function fetchCustomerInsights(params = {}) {
  const qs = buildAnalyticsQueryString(params);
  const res = await adminFetch(`/analytics/customer-insights${qs}`);
  return res.data;
}

export async function fetchServicePerformance(params = {}) {
  const qs = buildAnalyticsQueryString(params);
  const res = await adminFetch(`/analytics/service-performance${qs}`);
  return res.data;
}

export async function fetchWorkshopPerformance(params = {}) {
  const qs = buildAnalyticsQueryString(params);
  const res = await adminFetch(`/analytics/workshop-performance${qs}`);
  return res.data;
}

export async function fetchOutstandingCustomers(params = {}) {
  const qs = buildAnalyticsQueryString(params);
  const res = await adminFetch(`/analytics/outstanding-customers${qs}`);
  return res.data;
}

export async function fetchOutstandingSuppliers(params = {}) {
  const qs = buildAnalyticsQueryString(params);
  const res = await adminFetch(`/analytics/outstanding-suppliers${qs}`);
  return res.data;
}

export async function downloadAnalyticsReportCsv(reportType, params = {}) {
  const fullParams = { ...params, reportType };
  const qs = buildAnalyticsQueryString(fullParams);
  const url = `${API_BASE}/analytics/export${qs}`;

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    const err = new Error(errJson.error?.message || `Export failed with status ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}



