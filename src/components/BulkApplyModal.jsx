import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import './AuditModal.css'; // Reusing AuditModal styles for overlay
import './BulkApplyModal.css';

const BulkApplyModal = ({ sourceProduct, onClose, onSave }) => {
    const { products } = useData();
    const [matchingVariants, setMatchingVariants] = useState([]);
    const [selectedVariantIds, setSelectedVariantIds] = useState([]); // Store IDs

    useEffect(() => {
        if (!sourceProduct) return;

        // Strategy 1: Matches by MTP SKU (Parent Link)
        let matches = [];
        if (sourceProduct.mtpSku && sourceProduct.mtpSku.id) {
            matches = products.filter(p =>
                p.id !== sourceProduct.id && // Exclude self
                p.mtpSku && p.mtpSku.id === sourceProduct.mtpSku.id
            );
        }

        // Strategy 2: Fallback to SKU pattern matching if no strict parent link
        // e.g., SB-BNA-WH matches SB-BNA-BL
        if (matches.length === 0 && sourceProduct.skuCode) {
            const parts = sourceProduct.skuCode.split('-');
            if (parts.length > 2) {
                const baseSku = parts.slice(0, -1).join('-'); // Remove last part (color)
                matches = products.filter(p =>
                    p.id !== sourceProduct.id &&
                    p.skuCode.startsWith(baseSku)
                );
            }
        }

        setMatchingVariants(matches);
        // Default: Select all variants that don't have an audit yet? Or just ALL?
        // Let's select ALL by default for convenience.
        setSelectedVariantIds(matches.map(m => m.id));

    }, [sourceProduct, products]);

    const toggleVariant = (id) => {
        if (selectedVariantIds.includes(id)) {
            setSelectedVariantIds(selectedVariantIds.filter(vId => vId !== id));
        } else {
            setSelectedVariantIds([...selectedVariantIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedVariantIds.length === matchingVariants.length) {
            setSelectedVariantIds([]);
        } else {
            setSelectedVariantIds(matchingVariants.map(m => m.id));
        }
    };

    const handleSave = () => {
        onSave(selectedVariantIds);
    };

    if (!sourceProduct) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content bulk-modal">
                <div className="modal-header">
                    <h3>Bulk Apply Variants</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="source-summary">
                        <div className="summary-item">
                            <span className="label">Source SKU:</span>
                            <span className="value">{sourceProduct.skuCode}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Audited Weight:</span>
                            <span className="value">{sourceProduct.auditedWeight} kg</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Box Config:</span>
                            <span className="value">
                                {sourceProduct.auditedBoxes.length} Box(es)
                                ({sourceProduct.auditedBoxes.map(b => `${b.length}x${b.width}x${b.height}`).join(', ')})
                            </span>
                        </div>
                    </div>

                    <div className="variants-section">
                        <h4>Select Variants to Update ({matchingVariants.length} found)</h4>
                        {matchingVariants.length === 0 ? (
                            <div className="no-variants">No related variants found for this product.</div>
                        ) : (
                            <div className="variants-list">
                                <div className="variant-row header-row" onClick={toggleSelectAll}>
                                    <input
                                        type="checkbox"
                                        checked={matchingVariants.length > 0 && selectedVariantIds.length === matchingVariants.length}
                                        readOnly
                                    />
                                    <span>Select All</span>
                                </div>
                                {matchingVariants.map(variant => (
                                    <div key={variant.id} className="variant-row" onClick={() => toggleVariant(variant.id)}>
                                        <input
                                            type="checkbox"
                                            checked={selectedVariantIds.includes(variant.id)}
                                            readOnly
                                        />
                                        <span className="v-sku">{variant.skuCode}</span>
                                        <span className="v-name">{variant.productName || variant.mtpSku?.name || '-'}</span>
                                        {variant.hasAudit && <span className="v-bagde-audited">Audited</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={selectedVariantIds.length === 0}
                    >
                        Apply to {selectedVariantIds.length} Variants
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkApplyModal;
