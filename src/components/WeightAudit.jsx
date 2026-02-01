// Weight Audit Comparison Component
import React, { useState, useEffect, Fragment } from 'react';
import ZohoAPI from '../services/ZohoAPI';
import AutoSaveService from '../services/AutoSaveService';
import { calculateAuditWithCategories } from '../services/WeightCategoryCalculator';
import { parseDimensionAudit, calculateDimensionVariations } from '../services/DimensionAuditParser';
import SaveStatus from './SaveStatus';
import './WeightAudit.css';

const autoSave = new AutoSaveService(ZohoAPI);

const WeightAudit = () => {
    const [products, setProducts] = useState([]);
    const [auditResults, setAuditResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [courierSlab, setCourierSlab] = useState('STANDARD');

    useEffect(() => {
        loadProducts();
        ZohoAPI.init();
    }, []);

    const loadProducts = async () => {
        setIsLoading(true);
        try {
            const data = await ZohoAPI.fetchProducts();
            setProducts(data);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuditUpload = async (file) => {
        setIsLoading(true);
        try {
            console.log('📤 Upload started:', file.name);

            // Parse dimension audit file (Audit_Dimensions.csv or DimentionsMasterAudit.xlsx)
            const auditedProducts = await parseDimensionAudit(file);
            console.log('✅ Parsed products:', auditedProducts.length);

            // Calculate variations between CRM data and audited data
            const results = calculateDimensionVariations(products, auditedProducts);
            console.log('✅ Calculated variations:', results.length);

            setAuditResults(results);

            // Show success message
            const withChanges = results.filter(r => r.hasAudit && r.variations).length;
            alert(`✅ Upload successful!\n\n${withChanges} products matched with audit data.\n\nReview the changes below and click "Save to Zoho CRM" to update.`);

        } catch (error) {
            console.error('❌ Error processing audit:', error);
            alert(`Failed to process audit file.\n\nError: ${error.message}\n\nPlease ensure it's in the correct format (Audit_Dimensions.csv or DimentionsMasterAudit.xlsx)`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveToZoho = async () => {
        if (auditResults.length === 0) {
            alert('No audit data to save. Please upload an audit file first.');
            return;
        }

        const confirmed = window.confirm(
            `Save ${auditResults.filter(r => r.hasAudit).length} products to Zoho CRM?\n\n` +
            `This will update:\n` +
            `- Last Audited Weight\n` +
            `- Weight Variance\n` +
            `- Category Mismatch flags\n` +
            `- Last Audit Date\n\n` +
            `Continue?`
        );

        if (!confirmed) return;

        setIsLoading(true);
        try {
            const updates = auditResults
                .filter(r => r.hasAudit && r.variations)
                .map(r => ({
                    productId: r.id,
                    auditedWeight: r.auditedWeight,
                    variance: r.variations.totalWeightDelta,
                    billedCategory: r.billedCategory || '',
                    auditedCategory: r.auditedCategory || '',
                    categoryMismatch: r.variations.hasDimensionChanges || r.variations.hasWeightChange
                }));

            console.log('💾 Saving to Zoho:', updates.length, 'products');
            await autoSave.batchUpdateProducts(updates);

            alert(`✅ Successfully saved ${updates.length} products to Zoho CRM!`);
        } catch (error) {
            console.error('❌ Error saving to Zoho:', error);
            alert(`Failed to save to Zoho CRM.\n\nError: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const renderBoxDetails = (boxes) => {
        if (!boxes || boxes.length === 0) return <span className="text-muted">No boxes</span>;

        return (
            <div className="box-details">
                {boxes.map((box, idx) => (
                    <div key={idx} className="box-item">
                        <span className="box-number">Box {box.boxNumber}:</span>
                        <span className="box-dims">{box.length}×{box.width}×{box.height} {box.measurement}</span>
                        <span className="box-weight">{box.weight} {box.weightMeasurement}</span>
                    </div>
                ))}
            </div>
        );
    };

    const [activeTab, setActiveTab] = useState('ALL');
    const [expandedId, setExpandedId] = useState(null);

    const displayData = auditResults.length > 0 ? auditResults : products;

    const filteredData = activeTab === 'VARIANCES'
        ? displayData.filter(p => p.hasAudit && (p.variations?.hasWeightChange || p.variations?.hasDimensionChanges))
        : displayData;

    const varianceCount = displayData.filter(p => p.hasAudit && (p.variations?.hasWeightChange || p.variations?.hasDimensionChanges)).length;

    return (
        <div className="weight-audit">
            <SaveStatus />

            <div className="audit-header">
                <div>
                    <h2>Weight Audit Tool</h2>
                    <p className="subtitle">{displayData.length} products loaded</p>
                </div>
                <div className="audit-actions">
                    <select
                        value={courierSlab}
                        onChange={(e) => setCourierSlab(e.target.value)}
                        className="courier-select"
                    >
                        <option value="STANDARD">Standard Slabs</option>
                        <option value="COURIER_A">Courier A</option>
                    </select>
                    <label className="btn btn-primary">
                        📤 Upload Audit File
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            style={{ display: 'none' }}
                            onChange={(e) => e.target.files?.[0] && handleAuditUpload(e.target.files[0])}
                        />
                    </label>
                    {auditResults.length > 0 && (
                        <button
                            className="btn btn-success"
                            onClick={handleSaveToZoho}
                            disabled={isLoading}
                        >
                            💾 Save to Zoho CRM
                        </button>
                    )}
                </div>
            </div>

            <div className="audit-tabs">
                <button
                    className={`tab-item ${activeTab === 'ALL' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ALL')}
                >
                    All Products ({displayData.length})
                </button>
                <button
                    className={`tab-item ${activeTab === 'VARIANCES' ? 'active' : ''}`}
                    onClick={() => setActiveTab('VARIANCES')}
                >
                    Variances Found ({varianceCount})
                </button>
            </div>

            {isLoading ? (
                <div className="loading">Loading...</div>
            ) : (
                <div className="audit-table-container">
                    <table className="audit-table">
                        <thead>
                            <tr>
                                <th>Product Code</th>
                                <th>Product Name</th>
                                <th>Billed Weight</th>
                                <th>Audited Weight</th>
                                <th>Weight Δ</th>
                                <th>Dimension Δ</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((product) => {
                                const hasVariance = product.variations?.hasWeightChange;
                                const hasDimensionChange = product.variations?.hasDimensionChanges;
                                const isExpanded = product.id === expandedId;

                                const toggleExpand = (id) => {
                                    setExpandedId(expandedId === id ? null : id);
                                };

                                return (
                                    <Fragment key={product.id}>
                                        <tr
                                            className={`${hasDimensionChange ? 'category-mismatch' : ''} ${isExpanded ? 'expanded-row' : ''}`}
                                            onClick={() => toggleExpand(product.id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td className="product-code">
                                                <span className={`expand-icon ${isExpanded ? 'open' : ''}`}>▶</span>
                                                {product.productCode}
                                            </td>
                                            <td>{product.productName}</td>
                                            <td className="weight">{product.billedTotalWeight} kg</td>
                                            <td className="weight audited">
                                                {product.auditedWeight ? `${product.auditedWeight} kg` : '-'}
                                            </td>
                                            <td className={`variance ${hasVariance ? (product.variations.totalWeightDelta > 0 ? 'positive' : 'negative') : ''}`}>
                                                {product.variations?.totalWeightDelta ?
                                                    `${product.variations.totalWeightDelta > 0 ? '+' : ''}${product.variations.totalWeightDelta.toFixed(2)} kg (${product.variations.totalWeightDeltaPercent}%)`
                                                    : '-'
                                                }
                                            </td>
                                            <td className="dimension-variations">
                                                {product.variations?.boxes?.length > 0 ? (
                                                    <div className="box-variations">
                                                        {product.variations.boxes.map((box, idx) => (
                                                            <div key={idx} className={`box-var-item ${box.hasDimensionChange ? 'has-change' : ''}`}>
                                                                <span className="box-label">B{box.boxNumber}:</span>
                                                                {box.hasDimensionChange ? (
                                                                    <span className="dims-change">
                                                                        {box.deltaLength !== 0 && `L${box.deltaLength > 0 ? '+' : ''}${box.deltaLength}`}
                                                                        {box.deltaWidth !== 0 && ` W${box.deltaWidth > 0 ? '+' : ''}${box.deltaWidth}`}
                                                                        {box.deltaHeight !== 0 && ` H${box.deltaHeight > 0 ? '+' : ''}${box.deltaHeight}`}
                                                                    </span>
                                                                ) : (
                                                                    <span className="no-change">✓</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td>
                                                {hasDimensionChange ? (
                                                    <span className="status-badge status-warning">⚠️ Dim Change</span>
                                                ) : hasVariance ? (
                                                    <span className="status-badge status-info">ℹ️ Weight Δ</span>
                                                ) : product.hasAudit ? (
                                                    <span className="status-badge status-success">✓ OK</span>
                                                ) : (
                                                    <span className="status-badge status-pending">Pending</span>
                                                )}
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="comparison-detail-row">
                                                <td colSpan="7">
                                                    <div className="comparison-grid">
                                                        <div className="comparison-section crm">
                                                            <h4>ZOHO CRM (CURRENT)</h4>
                                                            <div className="data-box">
                                                                <div className="data-label">Total Weight: <span>{product.billedTotalWeight} kg</span></div>
                                                                {renderBoxDetails(product.boxes)}
                                                            </div>
                                                        </div>
                                                        <div className="comparison-arrow">→</div>
                                                        <div className="comparison-section audit">
                                                            <h4>AUDITED LOGISTICS (NEW)</h4>
                                                            <div className="data-box highlighted">
                                                                <div className="data-label">Audited Weight:
                                                                    <span className={hasVariance ? (product.variations.totalWeightDelta > 0 ? 'text-danger' : 'text-success') : ''}>
                                                                        {product.auditedWeight} kg
                                                                    </span>
                                                                </div>
                                                                <div className="box-details">
                                                                    {product.auditedBoxes?.map((box, idx) => {
                                                                        const variation = product.variations.boxes.find(b => b.boxNumber === box.boxNumber);
                                                                        return (
                                                                            <div key={idx} className={`box-item ${variation?.hasDimensionChange ? 'box-changed' : ''}`}>
                                                                                <span className="box-number">Box {box.boxNumber}:</span>
                                                                                <span className="box-dims">
                                                                                    {box.length}×{box.width}×{box.height}
                                                                                </span>
                                                                                <span className="box-weight">{box.weight} kg</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default WeightAudit;
