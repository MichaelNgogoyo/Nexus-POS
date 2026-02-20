import axios from 'axios';
import keycloak from '../auth/keycloak';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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
    return apiClient.post('/sale', saleData);
};

/**
 * Fetches a single sale by its ID.
 * @param {number} saleId - The ID of the sale to fetch.
 * @returns {Promise<any>}
 */
export const viewSale = (saleId) => {
    return apiClient.get('/sale', { params: { id: saleId } });
};

/**
 * Deletes a sale by its ID.
 * @param {number} saleId - The ID of the sale to delete.
 * @returns {Promise<any>}
 */
export const deleteSale = (saleId) => {
    return apiClient.put('/sale', { params: { id: saleId } });
};

/**
 * Fetches all sales transactions.
 * @returns {Promise<any>}
 */
export const getAllSales = () => {
    // NOTE: This assumes the backend returns all sales on a GET request to /sale without an ID.
    // You may need to adjust this if your backend has a different endpoint (e.g., /sales).
    return apiClient.get('/sale');
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

export const getApiBaseUrl = () => API_BASE_URL;


const api = {
    createSale,
    viewSale,
    deleteSale,
    getAllSales,
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductImageById,
    getProductImageUrl,
    adjustProductStock,
    getProductStockMovements,
    getApiBaseUrl,
};

export default api;
