import axios from 'axios';
import keycloak from '../auth/keycloak';
import {emitToast} from "../components/toastBus";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    async (config) => {
        if (keycloak?.authenticated) {
            await keycloak.updateToken(30);
            config.headers.Authorization = `Bearer ${keycloak.token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401 && keycloak?.authenticated) {
            keycloak.login({redirectUri: window.location.href});
        }

        const status = error?.response?.status;
        const message = error?.response?.data?.message || error?.message || "Request failed";
        if (status === 403) {
            emitToast("You are not allowed to perform this action.", "error");
        } else if (status >= 500) {
            emitToast("Server error. Please try again.", "error");
        } else {
            emitToast(message, "error");
        }
        return Promise.reject(error);
    }
);

// ========================================
// Sales API
// ========================================

/**
 * Creates a new sale.
 * @param {object} saleData - The data for the new sale.
 * @param {string} saleData.cashierId - The ID of the cashier.
 * @param {number} saleData.totalAmount - The total amount of the sale.
 * @param {string} saleData.paymentMethod - The payment method used.
 * @returns {Promise<any>}
 */
export const createSale = (saleData) => {
    return apiClient.post('/api/sale', saleData);
};

/**
 * Fetches a single sale by its ID.
 * @param {number} saleId - The ID of the sale to fetch.
 * @returns {Promise<any>}
 */
export const viewSale = (saleId) => {
    return apiClient.get(`/api/sale/${saleId}`);
};

/**
 * Deletes a sale by its ID.
 * @param {number} saleId - The ID of the sale to delete.
 * @returns {Promise<any>}
 */
export const deleteSale = (saleId) => {
    return apiClient.delete(`/api/sale/${saleId}`);
};

/**
 * Fetches all sales transactions (paginated).
 * @param {number} page - Zero-based page number.
 * @param {number} size - Page size.
 * @returns {Promise<any>}
 */
export const getAllSales = (page = 0, size = 20) => {
    return apiClient.get('/api/sale', { params: { page, size, sort: 'createdAt,desc' } });
};

export const processSaleReturn = (saleId, returnData) => {
    return apiClient.post(`/api/sale/${saleId}/return`, returnData);
};

// ========================================
// Products API
// ========================================

/**
 * Fetches all products.
 * @returns {Promise<any>}
 */
export const getAllProducts = () => {
    return apiClient.get('/api/product');
};

/** Paginated + searchable product list for checkout. */
export const searchProducts = (q = '', page = 0, size = 12) =>
    apiClient.get('/api/product/search', { params: { q, page, size } });

/**
 * Fetches a single product by its ID.
 * @param {number} productId - The ID of the product to fetch.
 * @returns {Promise<any>}
 */
export const getProductById = (productId) => {
    return apiClient.get(`/api/product/${productId}`);
};

/**
 * Creates a new product.
 * @param {FormData} formData - The product data as form data.
 * @returns {Promise<any>}
 */
export const createProduct = (formData) => {
    return apiClient.post('/api/product/create', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

/**
 * Updates a product.
 * @param {number} productId - The ID of the product to update.
 * @param {object} productData - The new product data.
 * @returns {Promise<any>}
 */
export const updateProduct = (productId, productData) => {
    return apiClient.put(`/api/product/${productId}`, productData);
};

export const updateProductWithImage = (productId, {name, price, active, discount, quantity, category, file}) => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("price", price);
    formData.append("active", active);
    formData.append("discount", discount);
    formData.append("quantity", quantity);
    formData.append("category", category ?? "");
    if (file) {
        formData.append("file", file);
    }

    return apiClient.put(`/api/product/${productId}/with-image`, formData, {
        headers: {"Content-Type": "multipart/form-data"},
    });
};

/**
 * Deletes a product by its ID.
 * @param {number} productId - The ID of the product to delete.
 * @returns {Promise<any>}
 */
export const deleteProduct = (productId) => {
    return apiClient.delete(`/api/product/${productId}`);
};

/**
 * Fetches the image for a product by its ID.
 * @param {number} productId - The ID of the product.
 * @returns {Promise<any>}
 */
export const getProductImageById = (productId) => {
    return apiClient.get(`/api/product/${productId}/image`, {
        responseType: 'blob', // Important for handling image data
    });
};

export const getProductImageUrl = (productId) => {
    return `${API_BASE_URL}/api/product/${productId}/image`;
};

export const adjustProductStock = (productId, adjustmentData) => {
    return apiClient.post(`/api/product/${productId}/stock-adjustment`, adjustmentData);
};

export const getProductStockMovements = (productId) => {
    return apiClient.get(`/api/product/${productId}/stock-movements`);
};

// ========================================
// Categories API
// ========================================

export const listCategories = () => apiClient.get('/api/category');
export const createCategory = (name) => apiClient.post('/api/category', null, { params: { name } });
export const updateCategory = (id, name) => apiClient.put(`/api/category/${id}`, null, { params: { name } });
export const deleteCategory = (id) => apiClient.delete(`/api/category/${id}`);
// Backward compatibility alias
export const getCategories = listCategories;

export const getApiBaseUrl = () => API_BASE_URL;

// ========================================
// Report / Dashboard API
// ========================================

/** GET /api/report/summary — all dashboard KPIs, chart data, recent sales, top products */
export const getDashboardSummary = () => apiClient.get('/api/report/summary');

/** GET /api/report/low-stock — products at or below their low-stock threshold */
export const getLowStockProducts = () => apiClient.get('/api/report/low-stock');

/** GET /api/config/tax-rate — returns { taxRate: number } from backend config. Public endpoint. */
export const getTaxRate = () => apiClient.get('/api/config/tax-rate');

// ========================================
// Restaurant Tables API
// ========================================
export const getAllTables = () => apiClient.get('/api/tables');
export const createTable = (data) => apiClient.post('/api/tables', data);
export const updateTableStatus = (id, status) => apiClient.put(`/api/tables/${id}/status`, { status });

// ========================================
// Restaurant Orders API
// ========================================
export const getActiveOrders = () => apiClient.get('/api/orders');
export const getOrderById = (id) => apiClient.get(`/api/orders/${id}`);
export const createOrder = (data) => apiClient.post('/api/orders', data);
export const updateOrderStatus = (id, status) => apiClient.put(`/api/orders/${id}/status`, { status });
export const addOrderItem = (orderId, item) => apiClient.post(`/api/orders/${orderId}/items`, item);

// ========================================
// Kitchen API
// ========================================
export const getKitchenOrders = () => apiClient.get('/api/kitchen/orders');
export const advanceKitchenStatus = (id, status) => apiClient.put(`/api/kitchen/orders/${id}/status`, { status });

// ========================================
// Shift API
// ========================================
export const getCurrentShift = (cashierId) => apiClient.get('/api/shifts/current', { params: { cashierId } });
export const openShift = (data) => apiClient.post('/api/shifts/open', data);
export const closeShift = (id, data) => apiClient.put(`/api/shifts/${id}/close`, data);

// ========================================
// Customers API (POS)
// ========================================
export const searchCustomers = (q) => apiClient.get('/api/customers/search', { params: { q } });
export const createCustomer = (data) => apiClient.post('/api/customers', data);
export const getAllCustomers = () => apiClient.get('/api/customers');

// ========================================
// Phase 2 APIs
// ========================================
export const getExpenses = () => apiClient.get('/api/expenses');
export const createExpense = (data) => apiClient.post('/api/expenses', data);
export const deleteExpense = (id) => apiClient.delete(`/api/expenses/${id}`);

export const getSuppliers = () => apiClient.get('/api/suppliers');
export const createSupplier = (data) => apiClient.post('/api/suppliers', data);
export const updateSupplier = (id, data) => apiClient.put(`/api/suppliers/${id}`, data);

export const getPurchaseOrders = () => apiClient.get('/api/purchase-orders');
export const createPurchaseOrder = (data) => apiClient.post('/api/purchase-orders', data);
export const updatePurchaseOrderStatus = (id, status) => apiClient.put(`/api/purchase-orders/${id}/status`, { status });
export const receivePurchaseOrder = (id) => apiClient.put(`/api/purchase-orders/${id}/receive`);

export const getReservations = () => apiClient.get('/api/reservations');
export const getTodayReservations = () => apiClient.get('/api/reservations/today');
export const createReservation = (data) => apiClient.post('/api/reservations', data);
export const updateReservationStatus = (id, status) => apiClient.put(`/api/reservations/${id}/status`, { status });

export const getAuditLog = (page = 0, size = 20) => apiClient.get('/api/audit', { params: { page, size } });

export const getCombos = () => apiClient.get('/api/combos');
export const getModifierGroups = (productId) => apiClient.get('/api/modifier-groups', { params: { productId } });


const api = {
    createSale,
    viewSale,
    deleteSale,
    getAllSales,
    processSaleReturn,
    getAllProducts,
    searchProducts,
    getProductById,
    createProduct,
    updateProduct,
    updateProductWithImage,
    deleteProduct,
    getProductImageById,
    getProductImageUrl,
    adjustProductStock,
    getProductStockMovements,
    listCategories,
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getApiBaseUrl,
    getDashboardSummary,
    getLowStockProducts,
    getTaxRate,
    getAllTables,
    createTable,
    updateTableStatus,
    getActiveOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    addOrderItem,
    getKitchenOrders,
    advanceKitchenStatus,
    getCurrentShift,
    openShift,
    closeShift,
    searchCustomers,
    createCustomer,
    getAllCustomers,
    // Phase 2
    getExpenses,
    createExpense,
    deleteExpense,
    getSuppliers,
    createSupplier,
    getPurchaseOrders,
    createPurchaseOrder,
    receivePurchaseOrder,
    getReservations,
    getTodayReservations,
    createReservation,
    updateReservationStatus,
    getAuditLog,
    getCombos,
    getModifierGroups,
};

export default api;
