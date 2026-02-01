// Data Context for Dimensions Audit Authenticator
import { createContext, useContext, useReducer, useEffect } from 'react';
import { AuditStatus } from '../models/Product';

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
                p.skuCode === updatedProduct.skuCode ? { ...p, ...updatedProduct } : p
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

    // Load data from localStorage on mount
    useEffect(() => {
        try {
            const savedData = localStorage.getItem(STORAGE_KEY);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                dispatch({ type: ACTIONS.SET_PRODUCTS, payload: parsed.products || [] });
                if (parsed.settings) {
                    dispatch({ type: ACTIONS.SET_SETTINGS, payload: parsed.settings });
                }
            }
        } catch (error) {
            console.error('Failed to load saved data:', error);
        }
    }, []);

    // Save to localStorage on changes
    useEffect(() => {
        if (state.products.length > 0) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    products: state.products,
                    settings: state.settings
                }));
            } catch (error) {
                console.error('Failed to save data:', error);
            }
        }
    }, [state.products, state.settings]);

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
        updateProduct: (product) => dispatch({ type: ACTIONS.UPDATE_PRODUCT, payload: product }),
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
