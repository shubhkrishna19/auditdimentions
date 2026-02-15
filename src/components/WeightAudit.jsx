// Weight Audit Comparison Component (Admin View Only)
import React, { useState, Fragment } from 'react';
import { useData } from '../context/DataContext';
import { parseDimensionAudit, calculateDimensionVariations } from '../services/DimensionAuditParser';
import SaveStatus from './SaveStatus';
import BulkApplyModal from './BulkApplyModal';
import { toast } from 'react-toastify';
import './WeightAudit.css';

const WeightAudit = () => {
    const {
        products,
        updateProduct,
        saveToCRM,
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

    // Save Progress State
    const [saveProgress, setSaveProgress] = useState(null); // { current: 0, total: 10 }

    // Filter & Sort State
    const [filters, setFilters] = useState({
        category: 'all',
        shipmentCat: 'all',
        liveStatus: 'all'
    });
    const [sortConfig, setSortConfig] = useState({
        field: null,
        direction: 'asc' // 'asc' or 'desc'
    });

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

        toast.success(`✅ Applied dimensions to ${targetIds.length} variants successfully!`, {
            autoClose: 3000
        });
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
                toast.warning(`⚠️ No products matched! Parsed ${auditedProducts.length} rows but found no matching SKUs.`, {
                    autoClose: 5000
                });
            } else {
                toast.success(`✅ Upload successful! ${withChanges} products matched with audit data.`, {
                    autoClose: 4000
                });
            }

        } catch (error) {
            console.error('[WeightAudit] Error processing audit:', error);
            toast.error(`❌ Failed to process audit file: ${error.message}`, {
                autoClose: 5000
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveToZoho = async () => {
        const auditedProducts = products.filter(p => p.hasAudit && p.variations);
        if (auditedProducts.length === 0) {
            toast.info('ℹ️ No audited products to sync!');
            return;
        }

        setLoading(true);
        setSaveProgress({ current: 0, total: auditedProducts.length });
        let successCount = 0;
        let failedCount = 0;

        try {
            for (let i = 0; i < auditedProducts.length; i++) {
                const product = auditedProducts[i];

                try {
                    const result = await saveToCRM(product.id, {
                        productType: product.productType,
                        skuCode: product.skuCode,
                        auditedWeight: product.auditedWeight,
                        auditedBoxes: product.auditedBoxes
                    });

                    if (result.success) {
                        successCount++;
                        // Mark as saved in local state
                        setAuditResults(prev => prev.map(r =>
                            r.id === product.id ? { ...r, savedToCRM: true } : r
                        ));
                    } else {
                        failedCount++;
                        console.error(`Failed to save ${product.skuCode}:`, result.error);
                    }
                } catch (error) {
                    failedCount++;
                    console.error(`Error saving ${product.skuCode}:`, error);
                }

                setSaveProgress({ current: i + 1, total: auditedProducts.length });

                // Rate limiting: 500ms delay between saves
                if (i < auditedProducts.length - 1) {
                    await new Promise(r => setTimeout(r, 500));
                }
            }

            if (successCount === auditedProducts.length) {
                toast.success(`✅ All ${successCount} products saved to CRM successfully!`, {
                    autoClose: 4000
                });
            } else if (successCount > 0) {
                toast.warning(`⚠️ Saved ${successCount}/${auditedProducts.length} products. ${failedCount} failed.`, {
                    autoClose: 5000
                });
            } else {
                toast.error(`❌ Failed to save any products to CRM`, {
                    autoClose: 5000
                });
            }

            refreshData();
        } catch (error) {
            toast.error(`❌ Sync failed: ${error.message}`, {
                autoClose: 5000
            });
        } finally {
            setLoading(false);
            setSaveProgress(null);
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
        let filtered = [];

        // First filter by tab
        switch (activeTab) {
            case 'PARENTS':
                filtered = products.filter(p => p.productType === 'parent');
                break;
            case 'CHILDREN':
                filtered = products.filter(p => p.productType === 'child');
                break;
            case 'AUDITED':
                filtered = products.filter(p => p.hasAudit === true);
                break;
            case 'VARIANCES':
                filtered = products.filter(p => p.hasAudit && (p.variations?.hasWeightChange || p.variations?.hasDimensionChanges));
                break;
            default:
                filtered = products.filter(p => p.productType === 'parent');
        }

        // Apply category filter
        if (filters.category !== 'all') {
            filtered = filtered.filter(p => p.productCategory === filters.category);
        }

        // Apply shipment category filter
        if (filters.shipmentCat !== 'all') {
            filtered = filtered.filter(p => p.weightCategory === filters.shipmentCat);
        }

        // Apply live status filter
        if (filters.liveStatus !== 'all') {
            if (filters.liveStatus === 'live') {
                filtered = filtered.filter(p => p.liveStatus === 'Y' || p.liveStatus === 'Live');
            } else {
                filtered = filtered.filter(p => p.liveStatus !== 'Y' && p.liveStatus !== 'Live');
            }
        }

        // Apply sorting
        if (sortConfig.field) {
            filtered = [...filtered].sort((a, b) => {
                let aVal, bVal;

                switch (sortConfig.field) {
                    case 'sku':
                        aVal = a.skuCode || '';
                        bVal = b.skuCode || '';
                        break;
                    case 'category':
                        aVal = a.productCategory || '';
                        bVal = b.productCategory || '';
                        break;
                    case 'billedWeight':
                        aVal = a.billedTotalWeight || 0;
                        bVal = b.billedTotalWeight || 0;
                        break;
                    case 'auditedWeight':
                        aVal = a.auditedWeight || 0;
                        bVal = b.auditedWeight || 0;
                        break;
                    case 'weightDelta':
                        aVal = a.variations?.totalWeightDelta || 0;
                        bVal = b.variations?.totalWeightDelta || 0;
                        break;
                    default:
                        return 0;
                }

                if (typeof aVal === 'string') {
                    return sortConfig.direction === 'asc'
                        ? aVal.localeCompare(bVal)
                        : bVal.localeCompare(aVal);
                } else {
                    return sortConfig.direction === 'asc'
                        ? aVal - bVal
                        : bVal - aVal;
                }
            });
        }

        return filtered;
    };

    const displayData = getFilteredProducts();

    // Get unique values for filters
    const uniqueCategories = [...new Set(products.map(p => p.productCategory).filter(Boolean))].sort();
    const uniqueShipmentCats = [...new Set(products.map(p => p.weightCategory).filter(Boolean))].sort();

    // Toggle sort
    const handleSort = (field) => {
        setSortConfig(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            category: 'all',
            shipmentCat: 'all',
            liveStatus: 'all'
        });
        setSortConfig({ field: null, direction: 'asc' });
    };
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

            {/* Filter Bar */}
            {products.length > 0 && (
                <div className="filter-bar">
                    <div className="filter-group">
                        <label>Category:</label>
                        <select
                            value={filters.category}
                            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                        >
                            <option value="all">All Categories</option>
                            {uniqueCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Shipment Cat:</label>
                        <select
                            value={filters.shipmentCat}
                            onChange={(e) => setFilters({ ...filters, shipmentCat: e.target.value })}
                        >
                            <option value="all">All Shipment Cats</option>
                            {uniqueShipmentCats.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Live Status:</label>
                        <select
                            value={filters.liveStatus}
                            onChange={(e) => setFilters({ ...filters, liveStatus: e.target.value })}
                        >
                            <option value="all">All Statuses</option>
                            <option value="live">Live Only</option>
                            <option value="notlive">Not Live</option>
                        </select>
                    </div>

                    <button className="btn-clear-filters" onClick={clearFilters}>
                        Clear Filters
                    </button>

                    {sortConfig.field && (
                        <span className="active-sort-info">
                            Sorted by: {sortConfig.field} ({sortConfig.direction === 'asc' ? '↑' : '↓'})
                        </span>
                    )}
                </div>
            )}

            <div className="audit-table-container">
                <table className="audit-table">
                    <thead>
                        <tr>
                            <th
                                className="sortable"
                                onClick={() => handleSort('sku')}
                                title="Click to sort by SKU"
                            >
                                SKU / Product
                                {sortConfig.field === 'sku' && (
                                    <span className="sort-arrow">{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                                )}
                            </th>
                            <th
                                className="sortable"
                                onClick={() => handleSort('category')}
                                title="Click to sort by Category"
                            >
                                Category
                                {sortConfig.field === 'category' && (
                                    <span className="sort-arrow">{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                                )}
                            </th>
                            <th>Shipment Cat</th>
                            <th
                                className="sortable"
                                onClick={() => handleSort('billedWeight')}
                                title="Click to sort by Billed Weight"
                            >
                                Billed Weight
                                {sortConfig.field === 'billedWeight' && (
                                    <span className="sort-arrow">{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                                )}
                            </th>
                            {hasAnyAuditData && (
                                <th
                                    className="sortable"
                                    onClick={() => handleSort('auditedWeight')}
                                    title="Click to sort by Audited Weight"
                                >
                                    Audited Weight
                                    {sortConfig.field === 'auditedWeight' && (
                                        <span className="sort-arrow">{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                                    )}
                                </th>
                            )}
                            {hasAnyAuditData && (
                                <th
                                    className="sortable"
                                    onClick={() => handleSort('weightDelta')}
                                    title="Click to sort by Weight Delta"
                                >
                                    Weight Δ
                                    {sortConfig.field === 'weightDelta' && (
                                        <span className="sort-arrow">{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                                    )}
                                </th>
                            )}
                            {hasAnyAuditData && <th>Dim Δ</th>}
                            {hasAnyAuditData && <th>Est. Impact (Mo)</th>}
                            <th>Status & Live</th>
                            <th></th>
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
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td className="sku-product-cell">
                                                <a
                                                    href="#"
                                                    className="product-link"
                                                    onClick={(e) => openProductInCRM(e, product)}
                                                    title="Open in Zoho CRM"
                                                >
                                                    <strong>{product.skuCode}</strong>
                                                </a>
                                                <div className="product-name-subtitle">
                                                    {product.productType === 'parent'
                                                        ? product.productName
                                                        : (product.mtpSku?.name || product.productName)}
                                                </div>
                                            </td>
                                            <td>{product.productCategory || '-'}</td>
                                            <td>
                                                <span className="weight-cat-badge">{product.weightCategory || '-'}</span>
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
                                            <td className="expand-arrow-cell" onClick={() => toggleExpand(product.id)}>
                                                <span className={`expand-icon ${isExpanded ? 'open' : ''}`}>&#9654;</span>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="comparison-detail-row">
                                                <td colSpan={hasAnyAuditData ? 11 : 7}>
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
