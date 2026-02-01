// Dashboard Page - Zoho Style Layout
import { useState } from 'react';
import { useData } from '../context/DataContext';
import { processExcelFile } from '../services/ExcelParser';
import Sidebar from '../components/Sidebar';
import DataGrid from '../components/DataGrid';

const Dashboard = () => {
    const {
        products,
        filteredProducts,
        setProducts,
        setLoading,
        setError
    } = useData();

    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileSelect = async (file) => {
        setIsProcessing(true);
        setLoading(true);

        try {
            const result = await processExcelFile(file);
            setProducts(result.products);
        } catch (error) {
            setError(error.message);
            alert('Failed to process file: ' + error.message);
        } finally {
            setIsProcessing(false);
            setLoading(false);
        }
    };

    return (
        <div className="app-layout">
            {products.length > 0 && <Sidebar />}

            <div className="main-content" style={{ marginLeft: products.length > 0 ? 'var(--sidebar-width)' : 0 }}>
                {/* File Upload Section - shown when no data */}
                {products.length === 0 && (
                    <div className="file-upload-zone" onClick={() => document.getElementById('file-input').click()}>
                        <input
                            id="file-input"
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                if (e.target.files?.[0]) {
                                    handleFileSelect(e.target.files[0]);
                                }
                            }}
                        />
                        <svg className="file-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <div className="file-upload-text">Upload Excel File</div>
                        <div className="file-upload-hint">Supports .xlsx, .xls, .csv files</div>
                    </div>
                )}

                {/* Data Grid */}
                {products.length > 0 && (
                    <div className="table-container">
                        <div className="table-header">
                            <div>
                                <div className="table-title">All Products</div>
                                <div className="table-count">Total Records: {filteredProducts.length}</div>
                            </div>
                            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 4v16m8-8H4" />
                                </svg>
                                Import Data
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            handleFileSelect(e.target.files[0]);
                                        }
                                    }}
                                />
                            </label>
                        </div>
                        <DataGrid products={filteredProducts} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
