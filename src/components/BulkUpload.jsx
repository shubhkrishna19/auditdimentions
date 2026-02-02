import { useState } from 'react';
import ZohoSyncService from '../services/ZohoSyncService';
import './BulkUpload.css';

const BulkUpload = () => {
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
    const [results, setResults] = useState(null);

    const handleFileUpload = async (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);

        // For now, load the pre-parsed JSON
        // In production, this would parse the Excel file client-side
        try {
            const response = await fetch('/parsed_billing_dimensions.json');
            const data = await response.json();
            setParsedData(data);
            console.log('[BulkUpload] Loaded', data.length, 'products');
        } catch (error) {
            console.error('[BulkUpload] Error loading data:', error);
            alert('Error loading billing dimensions data');
        }
    };

    const handleSync = async () => {
        if (!parsedData) {
            alert('Please upload a file first');
            return;
        }

        if (!confirm(`Sync ${parsedData.length} products to Zoho CRM?`)) {
            return;
        }

        setSyncing(true);
        setProgress({ current: 0, total: parsedData.length, message: 'Initializing...' });

        const syncService = new ZohoSyncService();

        try {
            await syncService.init();

            await syncService.syncAll(
                parsedData,
                // Progress callback
                (progressData) => {
                    setProgress({
                        current: progressData.current,
                        total: progressData.total,
                        message: `${progressData.success ? '✅' : '❌'} ${progressData.sku} (${progressData.action || 'failed'})`
                    });
                },
                // Complete callback
                (finalResults) => {
                    setResults(finalResults);
                    setSyncing(false);
                    setProgress({
                        current: finalResults.updated + finalResults.created,
                        total: finalResults.total,
                        message: 'Sync complete!'
                    });
                }
            );

        } catch (error) {
            console.error('[BulkUpload] Sync error:', error);
            alert('Sync failed: ' + error.message);
            setSyncing(false);
        }
    };

    const getProgressPercentage = () => {
        if (progress.total === 0) return 0;
        return Math.round((progress.current / progress.total) * 100);
    };

    return (
        <div className="bulk-upload-container">
            <div className="bulk-upload-header">
                <h2>📦 Bulk Upload Billing Dimensions</h2>
                <p className="subtitle">Upload and sync dimensions from Excel to Zoho CRM</p>
            </div>

            <div className="upload-section">
                <div className="upload-card">
                    <h3>1. Upload Excel File</h3>
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        disabled={syncing}
                    />
                    {parsedData && (
                        <div className="file-info">
                            <span className="file-badge">✅ {parsedData.length} products ready</span>
                        </div>
                    )}
                </div>

                {parsedData && !syncing && !results && (
                    <div className="upload-card">
                        <h3>2. Sync to Zoho CRM</h3>
                        <button
                            className="btn btn-primary btn-large"
                            onClick={handleSync}
                        >
                            🚀 Sync {parsedData.length} Products to Zoho
                        </button>
                    </div>
                )}

                {syncing && (
                    <div className="upload-card progress-card">
                        <h3>Syncing to Zoho CRM...</h3>
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar"
                                style={{ width: `${getProgressPercentage()}%` }}
                            >
                                {getProgressPercentage()}%
                            </div>
                        </div>
                        <div className="progress-stats">
                            <span>{progress.current} / {progress.total}</span>
                        </div>
                        <div className="progress-message">{progress.message}</div>
                    </div>
                )}

                {results && (
                    <div className="upload-card results-card">
                        <h3>✅ Sync Complete!</h3>
                        <div className="results-grid">
                            <div className="result-stat">
                                <div className="stat-value">{results.total}</div>
                                <div className="stat-label">Total Products</div>
                            </div>
                            <div className="result-stat success">
                                <div className="stat-value">{results.updated}</div>
                                <div className="stat-label">Updated</div>
                            </div>
                            <div className="result-stat success">
                                <div className="stat-value">{results.created}</div>
                                <div className="stat-label">Created</div>
                            </div>
                            <div className="result-stat error">
                                <div className="stat-value">{results.errors.length}</div>
                                <div className="stat-label">Errors</div>
                            </div>
                        </div>

                        {results.errors.length > 0 && (
                            <div className="errors-section">
                                <h4>Errors:</h4>
                                <ul className="error-list">
                                    {results.errors.map((err, idx) => (
                                        <li key={idx}>
                                            <strong>{err.sku}:</strong> {err.error}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="results-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setResults(null);
                                    setParsedData(null);
                                    setFile(null);
                                }}
                            >
                                Upload Another File
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => window.location.reload()}
                            >
                                Refresh Data
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkUpload;
