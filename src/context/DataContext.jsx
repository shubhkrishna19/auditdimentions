import { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { AuditStatus } from '../models/Product';
import ZohoAPI from '../services/ZohoAPI';
import AutoSaveService from '../services/AutoSaveService';

const autoSave = new AutoSaveService(ZohoAPI);

const STORAGE_KEY = 'dimensions_audit_data';

// Initial state
const initialState = {
    products: [],
    isLoading: false,
    error: null,
    filter: {
        status: 'all',
        search: '',
        hasVariance: false
    },
    settings: {
        volumetricDivisor: 5000,
        varianceThreshold: 5 // percentage
    },
    summary: {
        total: 0,
        audited: 0,
        pending: 0,
        withVariance: 0
    }
};

// Action types
const ACTIONS = {
    SET_LOADING: 'SET_LOADING',
    SET_ERROR: 'SET_ERROR',
    SET_PRODUCTS: 'SET_PRODUCTS',
    ADD_PRODUCTS: 'ADD_PRODUCTS',
    UPDATE_PRODUCT: 'UPDATE_PRODUCT',
    SET_FILTER: 'SET_FILTER',
    SET_SETTINGS: 'SET_SETTINGS',
    CLEAR_DATA: 'CLEAR_DATA'
};

// Calculate summary from products
const calculateSummary = (products) => ({
    total: products.length,
    audited: products.filter(p => p.status === AuditStatus.AUDITED).length,
    pending: products.filter(p => p.status === AuditStatus.PENDING).length,
    withVariance: products.filter(p => p.variance?.hasVariance).length,
    disputed: products.filter(p => p.status === AuditStatus.DISPUTED).length,
    resolved: products.filter(p => p.status === AuditStatus.RESOLVED).length
});

// Reducer
const dataReducer = (state, action) => {
    switch (action.type) {
        case ACTIONS.SET_LOADING:
            return { ...state, isLoading: action.payload };

        case ACTIONS.SET_ERROR:
            return { ...state, error: action.payload, isLoading: false };

        case ACTIONS.SET_PRODUCTS: {
            const products = action.payload;
            return {
                ...state,
                products,
                summary: calculateSummary(products),
                isLoading: false,
                error: null
            };
        }

        case ACTIONS.ADD_PRODUCTS: {
            const newProducts = action.payload;
            const existingSkus = new Set(state.products.map(p => p.skuCode));
            const uniqueNew = newProducts.filter(p => !existingSkus.has(p.skuCode));
            const allProducts = [...state.products, ...uniqueNew];
            return {
                ...state,
                products: allProducts,
                summary: calculateSummary(allProducts),
                isLoading: false
            };
        }

        case ACTIONS.UPDATE_PRODUCT: {
            const updatedProduct = action.payload;
            const products = state.products.map(p =>
                p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p
            );
            return {
                ...state,
                products,
                summary: calculateSummary(products)
            };
        }

        case ACTIONS.SET_FILTER:
            return { ...state, filter: { ...state.filter, ...action.payload } };

        case ACTIONS.SET_SETTINGS:
            return { ...state, settings: { ...state.settings, ...action.payload } };

        case ACTIONS.CLEAR_DATA:
            return { ...initialState };

        default:
            return state;
    }
};

// Create context
const DataContext = createContext(null);

// Provider component
export const DataProvider = ({ children }) => {
    const [state, dispatch] = useReducer(dataReducer, initialState);

    // Initialize Zoho and Fetch Data
    useEffect(() => {
        const initZoho = async () => {
            dispatch({ type: ACTIONS.SET_LOADING, payload: true });
            try {
                await ZohoAPI.init();
                const products = await ZohoAPI.fetchProducts();
                dispatch({ type: ACTIONS.SET_PRODUCTS, payload: products });
            } catch (error) {
                console.error('Zoho initialization/fetch failed:', error);
                dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to connect to Zoho CRM' });

                // Fallback to localStorage if available
                const savedData = localStorage.getItem(STORAGE_KEY);
                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    dispatch({ type: ACTIONS.SET_PRODUCTS, payload: parsed.products || [] });
                }
            } finally {
                dispatch({ type: ACTIONS.SET_LOADING, payload: false });
            }
        };

        initZoho();
    }, []);

    // Save settings (only) to localStorage on changes
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                settings: state.settings
            }));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }, [state.settings]);

    // Filter products based on current filter
    const filteredProducts = state.products.filter(product => {
        // Search filter
        if (state.filter.search) {
            const search = state.filter.search.toLowerCase();
            if (!product.skuCode.toLowerCase().includes(search)) {
                return false;
            }
        }

        // Status filter
        if (state.filter.status !== 'all' && product.status !== state.filter.status) {
            return false;
        }

        // Variance filter
        if (state.filter.hasVariance && !product.variance?.hasVariance) {
            return false;
        }

        return true;
    });

    // Actions
    const actions = {
        setLoading: (loading) => dispatch({ type: ACTIONS.SET_LOADING, payload: loading }),
        setError: (error) => dispatch({ type: ACTIONS.SET_ERROR, payload: error }),
        setProducts: (products) => dispatch({ type: ACTIONS.SET_PRODUCTS, payload: products }),
        addProducts: (products) => dispatch({ type: ACTIONS.ADD_PRODUCTS, payload: products }),
        updateProduct: (product) => {
            // Update local state
            dispatch({ type: ACTIONS.UPDATE_PRODUCT, payload: product });

            // Queue for Auto-Save to CRM (for non-critical background sync)
            if (product.id) {
                autoSave.queueSave(product.id, {
                    productType: product.productType,
                    skuCode: product.skuCode,
                    auditedWeight: product.auditedWeight || 0,
                    auditedBoxes: product.auditedBoxes || [],
                    variance: product.weightVariance || 0
                });
            }
        },
        saveToCRM: async (productId, auditData) => {
            try {
                dispatch({ type: ACTIONS.SET_LOADING, payload: true });
                const result = await ZohoAPI.updateProduct(productId, auditData);
                if (result.success) {
                    // Update local state to reflect it's been saved
                    dispatch({
                        type: ACTIONS.UPDATE_PRODUCT,
                        payload: { id: productId, savedToCRM: true }
                    });
                }
                return result;
            } catch (error) {
                console.error('Final sync failed:', error);
                return { success: false, error: error.message };
            } finally {
                dispatch({ type: ACTIONS.SET_LOADING, payload: false });
            }
        },
        refreshData: async () => {
            dispatch({ type: ACTIONS.SET_LOADING, payload: true });
            const products = await ZohoAPI.fetchProducts();
            dispatch({ type: ACTIONS.SET_PRODUCTS, payload: products });
        },
        setFilter: (filter) => dispatch({ type: ACTIONS.SET_FILTER, payload: filter }),
        setSettings: (settings) => dispatch({ type: ACTIONS.SET_SETTINGS, payload: settings }),
        clearData: () => {
            localStorage.removeItem(STORAGE_KEY);
            dispatch({ type: ACTIONS.CLEAR_DATA });
        }
    };

    return (
        <DataContext.Provider value={{
            ...state,
            filteredProducts,
            ...actions
        }}>
            {children}
        </DataContext.Provider>
    );
};

// Custom hook to use the context
export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export default DataContext;
