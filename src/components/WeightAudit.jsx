// Weight Audit Comparison Component (Admin View Only)
import React, { useState, Fragment } from 'react';
import { useData } from '../context/DataContext';
import { parseDimensionAudit, calculateDimensionVariations } from '../services/DimensionAuditParser';
import SaveStatus from './SaveStatus';
import BulkApplyModal from './BulkApplyModal';
import './WeightAudit.css';

const WeightAudit = () => {
    const {
        products,
        updateProduct, // Re-added updateProduct for bulk apply action
        isLoading,
        setLoading,
        refreshData,
        summary
    } = useData();

    const [auditResults, setAuditResults] = useState([]);
    const [activeTab, setActiveTab] = useState('PARENTS');
    const [expandedId, setExpandedId] = useState(null);

    // Bulk Apply State
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [selectedBulkSource, setSelectedBulkSource] = useState(null);

    const handleBulkApplySave = (targetIds) => {
        if (!selectedBulkSource) return;

        // Find the full product object for the source to copy dimensions from
        // Note: selectedBulkSource is already the object, but let's be safe
        const sourceWeight = selectedBulkSource.auditedWeight;
        const sourceBoxes = selectedBulkSource.auditedBoxes;

        console.log(`[BulkApply] Applying ${selectedBulkSource.skuCode} to ${targetIds.length} variants`);

        // We'll process each update sequentially or dispatch all at once
        // Since updateProduct is likely one-at-a-time, we'll loop.
        // In a real app with batch API, we'd send one request.

        targetIds.forEach(targetId => {
            const targetProduct = products.find(p => p.id === targetId);
            if (targetProduct) {
                const billedWeight = targetProduct.billedTotalWeight || 0;
                const delta = sourceWeight - billedWeight;

                // Fire update
                updateProduct({
                    id: targetId,
                    auditedWeight: sourceWeight,
                    auditedBoxes: sourceBoxes,
                    hasAudit: true,
                    variations: {
                        totalWeightDelta: delta,
                        hasWeightChange: Math.abs(delta) > 0.01,
                        hasDimensionChanges: true
                    },
                    // Recalculate economics for the TARGET variant using its own sales velocity
                    costImpact: delta * (targetProduct.shippingCostPerKg || 25) * (targetProduct.soldsPerMonth || 0),
                    soldsPerMonth: targetProduct.soldsPerMonth || 0
                });
            }
        });

        alert(`Success! Applied dimensions to ${targetIds.length} variants.`);
        setShowBulkModal(false);
        setSelectedBulkSource(null);
    };

    // ... (rest of existing code until render) ...

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

            if (withChanges === 0) {
                alert(`⚠️ No products matched!\n\n` +
                      `Parsed ${auditedProducts.length} rows from Excel.\n` +
                      `Found ${products.length} products in CRM.\n\n` +
                      `\n` +
                      `Common issues:\n` +
                      `• SKU format mismatch (Excel vs CRM)\n` +
                      `• Wrong Excel file uploaded\n` +
                      `• Products not loaded from CRM yet`);
            } else {
                alert(`✅ Upload successful!\n\n${withChanges} products matched with audit data.\n\nSwitch to "Audited" or "Variances" tab to review.`);
            }

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
            alert('No audited products to sync!');
            return;
        }

        setLoading(true);
        let successCount = 0;

        try {
            for (const product of auditedProducts) {
                const result = await ZohoAPI.updateProduct(product.id, {
                    productType: product.productType,
                    skuCode: product.skuCode,
                    auditedWeight: product.auditedWeight,
                    auditedBoxes: product.auditedBoxes,
                    variance: product.variations.totalWeightDelta,
                    auditedCategory: product.weightCategoryAudited,
                    billedCategory: product.weightCategoryBilled,
                    categoryMismatch: product.categoryMismatch,
                    // Pass calculated economics
                    costImpact: (product.variations.totalWeightDelta) * (product.shippingCostPerKg || 25) * (product.soldsPerMonth || 0),
                    soldsPerMonth: product.soldsPerMonth || 0
                });

                if (result.success) successCount++;
            }
            alert(`Sync complete! ${successCount}/${auditedProducts.length} records updated in Zoho CRM.`);
            refreshData();
        } catch (error) {
            alert(`Sync failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleMasterSync = async () => {
        const confirmSync = window.confirm("This will overwrite ALL Billing Dimensions and Weights in Zoho CRM with data from the Master Excel. Proceed?");
        if (!confirmSync) return;

        setLoading(true);
        try {
            console.log('[WeightAudit] Starting Master Sync...');
            // In a real widget, we'd fetch the JSON or re-parse the excel
            // Since we're in a browser, we'll try to fetch the local JSON if possible
            // Or guide the user to upload it. For simplicity, let's look for match in current products

            const response = await fetch('./parsed_billing_dimensions.json');
            const masterData = await response.json();

            let updateCount = 0;
            for (const item of masterData) {
                // Find matching product in currently loaded list
                const match = products.find(p => p.skuCode === item.skuCode);
                if (match) {
                    console.log(`[WeightAudit] Syncing ${item.skuCode} as ${match.productType}...`);

                    // 🏗️ CONSTRUCT ALIGNED DATA based on actual CRM type
                    const isParent = match.productType === 'parent';
                    const auditData = {
                        productType: match.productType,
                        auditedWeight: item.totalWeightKg,
                        auditedCategory: item.category,
                        billedCategory: item.category, // Defaulting to same for master sync
                        variance: 0,
                        categoryMismatch: false,
                        auditedBoxes: item.boxes.map(b => ({
                            length: b.length,
                            width: b.width,
                            height: b.height,
                            weight: b.weight / 1000 // Convert grams from excel to KG for the API mapper
                        }))
                    };

                    const result = await ZohoAPI.updateProduct(match.id, auditData);
                    if (result.success) updateCount++;
                }
            }
            alert(`Master Sync Complete! Updated ${updateCount} records matching the Excel list.`);
            refreshData();
        } catch (error) {
            console.error('[WeightAudit] Master Sync Error:', error);
            alert('Master Sync failed. Ensure parsed_billing_dimensions.json is accessible.');
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
            default:
                return products.filter(p => p.productType === 'parent'); // Default to parents
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
                    <h2>Audit Dimensions</h2>
                    <p className="subtitle">
                        {isLoading ? 'Syncing with Zoho...' : `${products.length} Total Products | ${parentCount} Parents | ${childCount} Children`}
                    </p>
                </div>
                <div className="audit-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={refreshData}
                        disabled={isLoading}
                    >
                        Refresh CRM
                    </button>
                    <button
                        className="btn btn-secondary sync-master-btn"
                        onClick={handleMasterSync}
                        disabled={isLoading}
                        title="Sync data from Master Excel"
                    >
                        Master Sync (Excel)
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
                            className="btn btn-primary"
                            onClick={handleSaveToZoho}
                            disabled={isLoading}
                        >
                            Sync Audits to CRM
                        </button>
                    )}
                </div>
            </div>

            <div className="audit-tabs">
                <button
                    className={`tab-item ${activeTab === 'PARENTS' ? 'active' : ''}`}
                    onClick={() => setActiveTab('PARENTS')}
                >
                    Parent SKUs - Working ({parentCount})
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
                <button
                    className={`tab-item ${activeTab === 'CHILDREN' ? 'active' : ''}`}
                    onClick={() => setActiveTab('CHILDREN')}
                >
                    Child Products - Reference ({childCount})
                </button>
            </div>

            <div className="audit-table-container">
                <table className="audit-table">
                    <thead>
                        <tr>
                            <th>MTP SKU</th>
                            <th>Product Code</th>
                            <th>Category</th>
                            <th>Shipment Cat</th>
                            <th>Billed Weight</th>
                            {hasAnyAuditData && <th>Audited Weight</th>}
                            {hasAnyAuditData && <th>Weight Δ</th>}
                            {hasAnyAuditData && <th>Dim Δ</th>}
                            {hasAnyAuditData && <th>Est. Impact (Mo)</th>}
                            <th>Status & Live</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayData.length === 0 ? (
                            <tr>
                                <td colSpan={hasAnyAuditData ? 10 : 6} className="text-center py-4">
                                    {isLoading ? 'Loading data...' : 'No products found matching this filter.'}
                                </td>
                            </tr>
                        ) : (
                            displayData.map((product) => {
                                const hasVariance = product.variations?.hasWeightChange;
                                const hasDimensionChange = product.variations?.hasDimensionChanges;
                                const isExpanded = product.id === expandedId;

                                // Calculate Cost Impact
                                let impact = 0;
                                if (hasVariance && product.variations?.totalWeightDelta) {
                                    // Savings = (Billed - Audited) * CostPerKg * Sales
                                    // If totalWeightDelta is positive (Billed > Audited), we save money.
                                    impact = (product.variations.totalWeightDelta) * (product.shippingCostPerKg || 25) * (product.soldsPerMonth || 0);
                                }

                                return (
                                    <Fragment key={product.id}>
                                        <tr
                                            className={`${hasDimensionChange ? 'category-mismatch' : ''} ${isExpanded ? 'expanded-row' : ''}`}
                                            onClick={() => toggleExpand(product.id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td className="mtp-sku-name">
                                                {product.productType === 'parent'
                                                    ? product.skuCode
                                                    : (product.mtpSku?.name || '-')}
                                            </td>
                                            <td className="product-code">
                                                <span className={`expand-icon ${isExpanded ? 'open' : ''}`}>&#9654;</span>
                                                <a
                                                    href="#"
                                                    className="product-link"
                                                    onClick={(e) => openProductInCRM(e, product)}
                                                    title="Open in Zoho CRM"
                                                >
                                                    {product.skuCode}
                                                </a>
                                            </td>
                                            <td>{product.productCategory || '-'}</td>
                                            <td>
                                                <span className="weight-cat-badge">{product.shipmentCategory || product.weightCategory || '-'}</span>
                                            </td>
                                            <td className="weight">{product.billedTotalWeight?.toFixed(2)} kg</td>
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
                                            {hasAnyAuditData && (
                                                <td className={`cost-impact ${impact > 0 ? 'positive-impact' : impact < 0 ? 'negative-impact' : ''}`}>
                                                    {impact !== 0 ? (
                                                        <span title={`Based on ${product.soldsPerMonth} sold/mo @ ₹${product.shippingCostPerKg}/kg`}>
                                                            {impact > 0 ? 'Save ' : 'Loss '}
                                                            ₹{Math.abs(impact).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                            )}
                                            <td className="status-cell-actions">
                                                <div className="flex-center gap-2">
                                                    {/* Live Status Badge */}
                                                    <span className={`status-badge ${product.liveStatus === 'Y' || product.liveStatus === 'Live' ? 'status-success' : 'status-pending'}`} title="Zoho Live Status">
                                                        {product.liveStatus || 'NL'}
                                                    </span>

                                                    {hasDimensionChange ? (
                                                        <span className="status-badge status-warning">Dim Var</span>
                                                    ) : hasVariance ? (
                                                        <span className="status-badge status-secondary">Wht Var</span>
                                                    ) : product.hasAudit ? (
                                                        <span className="status-badge status-success">Match</span>
                                                    ) : null}

                                                    {/* Bulk Apply Button - Only for Audited Items */}
                                                    {product.hasAudit && (
                                                        <button
                                                            className="btn-icon bulk-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedBulkSource(product);
                                                                setShowBulkModal(true);
                                                            }}
                                                            title="Apply dimensions to variants"
                                                        >
                                                            Bulk Apply
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="comparison-detail-row">
                                                <td colSpan={hasAnyAuditData ? 10 : 6}>
                                                    <div className="comparison-grid">
                                                        <div className="comparison-section crm">
                                                            <div className="section-header">ZOHO CRM (CURRENT)</div>
                                                            <div className="data-box">
                                                                <div className="data-row">
                                                                    <div className="data-label">Total Weight: <span>{product.billedTotalWeight} kg</span></div>
                                                                    <div className="data-label">Manufacturer: <span>{product.manufacturer || '-'}</span></div>
                                                                </div>
                                                                <div className="data-row">
                                                                    <div className="data-label">Avg. Sales: <span>{product.soldsPerMonth || 0} / mo</span></div>
                                                                    <div className="data-label">Ship Rate: <span>₹{product.shippingCostPerKg || 25} / kg</span></div>
                                                                </div>

                                                                {product.mtpSku && (
                                                                    <div className="data-label mtp-link">
                                                                        Linked Parent:
                                                                        <a href="#" onClick={(e) => { e.preventDefault(); openProductInCRM(e, { ...product, id: product.mtpSku.id, productType: 'parent' }) }}>
                                                                            {product.mtpSku.name}
                                                                        </a>
                                                                    </div>
                                                                )}

                                                                {product.identifiers && product.identifiers.length > 0 && (
                                                                    <div className="identifiers-list">
                                                                        {product.identifiers.map((id, idx) => (
                                                                            <span key={idx} className="identifier-badge">
                                                                                {id.channel}: {id.identifier}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {renderBoxDetails(product.boxes)}
                                                            </div>
                                                        </div>
                                                        {product.hasAudit && (
                                                            <>
                                                                <div className="comparison-separator">|</div>
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

            {showBulkModal && selectedBulkSource && (
                <BulkApplyModal
                    sourceProduct={selectedBulkSource}
                    onClose={() => {
                        setShowBulkModal(false);
                        setSelectedBulkSource(null);
                    }}
                    onSave={handleBulkApplySave}
                />
            )}
        </div>
    );
};

export default WeightAudit;
