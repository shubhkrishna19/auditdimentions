// Weight Audit Comparison Component
import React, { useState, Fragment } from 'react';
import { useData } from '../context/DataContext';
import { parseDimensionAudit, calculateDimensionVariations } from '../services/DimensionAuditParser';
import SaveStatus from './SaveStatus';
import AuditModal from './AuditModal'; // Import new modal
import './WeightAudit.css';

const WeightAudit = () => {
    const {
        products,
        isLoading,
        setLoading,
        updateProduct,
        refreshData,
        summary
    } = useData();

    const [auditResults, setAuditResults] = useState([]);
    const [activeTab, setActiveTab] = useState('ALL');
    const [expandedId, setExpandedId] = useState(null);
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    // ... (rest of existing code until render) ...

    const handleAuditClick = (e, product) => {
        e.stopPropagation();
        setSelectedProduct(product);
        setShowAuditModal(true);
    };

    const handleAuditSave = (auditEntry) => {
        console.log('Saved audit entry:', auditEntry);

        // Calculate variations immediately
        const newAuditedWeight = auditEntry.totals.chargeableWeight;
        const billedWeight = selectedProduct.billedTotalWeight || 0;
        const delta = newAuditedWeight - billedWeight;

        // Update local product state
        updateProduct({
            id: selectedProduct.id,
            auditedWeight: newAuditedWeight,
            auditedBoxes: auditEntry.boxes,
            hasAudit: true,
            variations: {
                totalWeightDelta: delta,
                hasWeightChange: Math.abs(delta) > 0.01,
                hasDimensionChanges: true // Assume manual entry implies verification
            }
        });

        // Close modal
        setShowAuditModal(false);
        setSelectedProduct(null);
        alert('Audit saved locally! Click "Sync to ZOHO" to push changes.');
    };

    // ... (rest of code) ...


    const handleAuditUpload = async (file) => {
        setLoading(true);
        try {
            console.log('[WeightAudit] Upload started:', file.name);

            // Parse dimension audit file
            const auditedProducts = await parseDimensionAudit(file);
            console.log('[WeightAudit] Parsed audited rows:', auditedProducts.length);

            // Calculate variations compared to CURRENT products in state
            const results = calculateDimensionVariations(products, auditedProducts);

            // Update products with audit data
            results.forEach(result => {
                if (result.hasAudit) {
                    const productIndex = products.findIndex(p => p.id === result.id);
                    if (productIndex !== -1) {
                        products[productIndex] = { ...products[productIndex], ...result };
                    }
                }
            });

            setAuditResults(results);

            // Show success message
            const withChanges = results.filter(r => r.hasAudit && r.variations).length;
            alert(`Upload successful!\n\n${withChanges} products matched with audit data.\n\nSwitch to "Audited" or "Variances" tab to review.`);

        } catch (error) {
            console.error('[WeightAudit] Error processing audit:', error);
            alert(`Failed to process audit file.\n\nError: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveToZoho = async () => {
        const auditedProducts = products.filter(p => p.hasAudit && p.variations);
        if (auditedProducts.length === 0) {
            alert('No audited products to sync.');
            return;
        }

        const confirmed = window.confirm(`Sync ${auditedProducts.length} audited products to Zoho CRM?`);
        if (!confirmed) return;

        setLoading(true);
        try {
            for (const result of auditedProducts) {
                updateProduct({
                    id: result.id,
                    skuCode: result.productCode,
                    auditedWeight: result.auditedWeight,
                    weightVariance: result.variations.totalWeightDelta,
                    weightCategoryBilled: result.weightCategoryBilled,
                    weightCategoryAudited: result.weightCategoryAudited,
                    categoryMismatch: result.variations.hasDimensionChanges || result.variations.hasWeightChange
                });
            }

            alert('Updates queued for Zoho CRM sync!');
        } catch (error) {
            console.error('[WeightAudit] Bulk save failed:', error);
            alert('Failed to queue updates.');
        } finally {
            setLoading(false);
        }
    };

    const renderBoxDetails = (boxes) => {
        if (!boxes || boxes.length === 0) return <span className="text-muted">No boxes</span>;

        return (
            <div className="box-details">
                {boxes.map((box, idx) => (
                    <div key={idx} className="box-item">
                        <span className="box-number">Box {box.boxNumber}:</span>
                        <span className="box-dims">{box.length}×{box.width}×{box.height} cm</span>
                        <span className="box-weight">{box.weight} kg</span>
                    </div>
                ))}
            </div>
        );
    };

    // Tab filtering
    const getFilteredProducts = () => {
        switch (activeTab) {
            case 'PARENTS':
                return products.filter(p => p.productType === 'parent');
            case 'CHILDREN':
                return products.filter(p => p.productType === 'child');
            case 'AUDITED':
                return products.filter(p => p.hasAudit === true);
            case 'VARIANCES':
                return products.filter(p => p.hasAudit && (p.variations?.hasWeightChange || p.variations?.hasDimensionChanges));
            case 'ALL':
            default:
                return products;
        }
    };

    const displayData = getFilteredProducts();
    const hasAnyAuditData = products.some(p => p.hasAudit);

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    // Open product in Zoho CRM's native product page
    const openProductInCRM = (e, product) => {
        e.stopPropagation(); // Prevent row expand/collapse

        if (typeof ZOHO !== 'undefined' && ZOHO.CRM && ZOHO.CRM.UI) {
            // Determine the entity type based on productType
            const entity = product.productType === 'parent' ? 'Parent_MTP_SKU' : 'Products';

            ZOHO.CRM.UI.Record.open({ Entity: entity, RecordID: product.id })
                .then((response) => {
                    console.log('[WeightAudit] Opened CRM record:', response);
                })
                .catch((error) => {
                    console.error('[WeightAudit] Failed to open CRM record:', error);
                    alert('Could not open product page. Please try again.');
                });
        } else {
            // Fallback for development - show alert
            alert(`Development mode: Would open ${product.productType === 'parent' ? 'Parent_MTP_SKU' : 'Products'} record ID: ${product.id}`);
        }
    };

    // Count products by type
    const parentCount = products.filter(p => p.productType === 'parent').length;
    const childCount = products.filter(p => p.productType === 'child').length;
    const auditedCount = products.filter(p => p.hasAudit).length;
    const varianceCount = products.filter(p => p.hasAudit && (p.variations?.hasWeightChange || p.variations?.hasDimensionChanges)).length;

    return (
        <div className="weight-audit">
            <SaveStatus />

            <div className="audit-header">
                <div className="header-info">
                    <h2>Weight Audit - Live CRM Data</h2>
                    <p className="subtitle">
                        {isLoading ? 'Syncing with Zoho...' : `${products.length} Total Products | ${parentCount} Parents | ${childCount} Children`}
                    </p>
                </div>
                <div className="audit-actions">
                    <button className="btn btn-secondary" onClick={refreshData} disabled={isLoading}>
                        Refresh CRM
                    </button>
                    <label className="btn btn-primary">
                        Upload Audit Excel
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            style={{ display: 'none' }}
                            onChange={(e) => e.target.files?.[0] && handleAuditUpload(e.target.files[0])}
                        />
                    </label>
                    {hasAnyAuditData && (
                        <button
                            className="btn btn-success"
                            onClick={handleSaveToZoho}
                            disabled={isLoading}
                        >
                            Sync to ZOHO
                        </button>
                    )}
                </div>
            </div>

            <div className="audit-tabs">
                <button
                    className={`tab-item ${activeTab === 'ALL' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ALL')}
                >
                    All Products ({products.length})
                </button>
                <button
                    className={`tab-item ${activeTab === 'PARENTS' ? 'active' : ''}`}
                    onClick={() => setActiveTab('PARENTS')}
                >
                    Parent SKUs ({parentCount})
                </button>
                <button
                    className={`tab-item ${activeTab === 'CHILDREN' ? 'active' : ''}`}
                    onClick={() => setActiveTab('CHILDREN')}
                >
                    Child Products ({childCount})
                </button>
                <button
                    className={`tab-item ${activeTab === 'AUDITED' ? 'active' : ''}`}
                    onClick={() => setActiveTab('AUDITED')}
                    disabled={!hasAnyAuditData}
                >
                    Audited ({auditedCount})
                </button>
                <button
                    className={`tab-item ${activeTab === 'VARIANCES' ? 'active' : ''}`}
                    onClick={() => setActiveTab('VARIANCES')}
                    disabled={!hasAnyAuditData}
                >
                    Variances ({varianceCount})
                </button>
            </div>

            <div className="audit-table-container">
                <table className="audit-table">
                    <thead>
                        <tr>
                            <th>MTP SKU</th>
                            <th>Product Code</th>
                            <th>Type</th>
                            <th>Billed Weight</th>
                            {hasAnyAuditData && <th>Audited Weight</th>}
                            {hasAnyAuditData && <th>Weight Δ</th>}
                            {hasAnyAuditData && <th>Dim Δ</th>}
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayData.length === 0 ? (
                            <tr>
                                <td colSpan={hasAnyAuditData ? 8 : 5} className="text-center py-4">
                                    {isLoading ? 'Loading data...' : 'No products found matching this filter.'}
                                </td>
                            </tr>
                        ) : (
                            displayData.map((product) => {
                                const hasVariance = product.variations?.hasWeightChange;
                                const hasDimensionChange = product.variations?.hasDimensionChanges;
                                const isExpanded = product.id === expandedId;

                                return (
                                    <Fragment key={product.id}>
                                        <tr
                                            className={`${hasDimensionChange ? 'category-mismatch' : ''} ${isExpanded ? 'expanded-row' : ''}`}
                                            onClick={() => toggleExpand(product.id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td className="mtp-sku-name">{product.mtpSkuName || '-'}</td>
                                            <td className="product-code">
                                                <span className={`expand-icon ${isExpanded ? 'open' : ''}`}>&#9654;</span>
                                                <a
                                                    href="#"
                                                    className="product-link"
                                                    onClick={(e) => openProductInCRM(e, product)}
                                                    title="Open in Zoho CRM"
                                                >
                                                    {product.productCode}
                                                </a>
                                            </td>
                                            <td>
                                                <span className={`type-badge ${product.productType === 'parent' ? 'type-parent' : 'type-child'}`}>
                                                    {product.productType === 'parent' ? 'Parent' : 'Child'}
                                                </span>
                                            </td>
                                            <td className="weight">{product.billedTotalWeight.toFixed(2)} kg</td>
                                            {hasAnyAuditData && (
                                                <td className="weight audited">
                                                    {product.auditedWeight ? `${product.auditedWeight.toFixed(2)} kg` : '-'}
                                                </td>
                                            )}
                                            {hasAnyAuditData && (
                                                <td className={`variance ${hasVariance ? (product.variations.totalWeightDelta > 0 ? 'positive' : 'negative') : ''}`}>
                                                    {product.variations?.totalWeightDelta ?
                                                        `${product.variations.totalWeightDelta > 0 ? '+' : ''}${product.variations.totalWeightDelta.toFixed(2)} kg`
                                                        : '-'
                                                    }
                                                </td>
                                            )}
                                            {hasAnyAuditData && (
                                                <td className="dimension-variations">
                                                    {product.variations?.boxes?.length > 0 ? (
                                                        <div className="box-variations">
                                                            {product.variations.boxes.map((box, idx) => (
                                                                <div key={idx} className={`box-var-item ${box.hasDimensionChange ? 'has-change' : ''}`}>
                                                                    <span className="box-label">B{box.boxNumber}:</span>
                                                                    {box.hasDimensionChange ? <span className="dims-change">Changed</span> : <span className="no-change">OK</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                            )}
                                            <td className="status-cell-actions">
                                                <div className="flex-center">
                                                    {hasDimensionChange ? (
                                                        <span className="status-badge status-warning">Dim Variance</span>
                                                    ) : hasVariance ? (
                                                        <span className="status-badge status-secondary">Wht Variance</span>
                                                    ) : product.hasAudit ? (
                                                        <span className="status-badge status-success">Matched</span>
                                                    ) : product.lastAuditDate ? (
                                                        <span className="status-badge status-info">Prev Audit</span>
                                                    ) : (
                                                        <span className="status-badge status-pending">No Audit</span>
                                                    )}

                                                    <button
                                                        className="btn-icon audit-btn"
                                                        onClick={(e) => handleAuditClick(e, product)}
                                                        title="Enter Audit Dimensions"
                                                    >
                                                        &#9998;
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="comparison-detail-row">
                                                <td colSpan={hasAnyAuditData ? 8 : 5}>
                                                    <div className="comparison-grid">
                                                        <div className="comparison-section crm">
                                                            <div className="section-header">ZOHO CRM (CURRENT)</div>
                                                            <div className="data-box">
                                                                <div className="data-label">Total Weight: <span>{product.billedTotalWeight} kg</span></div>
                                                                <div className="data-label">Product Type: <span>{product.productType}</span></div>
                                                                {renderBoxDetails(product.boxes)}
                                                            </div>
                                                        </div>
                                                        {product.hasAudit && (
                                                            <>
                                                                <div className="comparison-arrow">→</div>
                                                                <div className="comparison-section audit">
                                                                    <div className="section-header">AUDIT DATA (UPLOADED)</div>
                                                                    <div className="data-box highlighted">
                                                                        <div className="data-label">Audited Weight:
                                                                            <span className={hasVariance ? (product.variations.totalWeightDelta > 0 ? 'text-danger' : 'text-success') : ''}>
                                                                                {product.auditedWeight?.toFixed(2) || '-'} kg
                                                                            </span>
                                                                        </div>
                                                                        <div className="box-details">
                                                                            {(product.auditedBoxes || []).map((box, idx) => {
                                                                                const variation = product.variations?.boxes?.find(b => b.boxNumber === box.boxNumber);
                                                                                return (
                                                                                    <div key={idx} className={`box-item ${variation?.hasDimensionChange ? 'box-changed' : ''}`}>
                                                                                        <span className="box-number">Box {box.boxNumber}:</span>
                                                                                        <span className="box-dims">{box.length}×{box.width}×{box.height} cm</span>
                                                                                        <span className="box-weight">{box.weight} kg</span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {showAuditModal && selectedProduct && (
                <AuditModal
                    product={selectedProduct}
                    onClose={() => setShowAuditModal(false)}
                    onSave={handleAuditSave}
                />
            )}
        </div>
    );
};

export default WeightAudit;
