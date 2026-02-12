import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { toast } from 'react-toastify';
import './WarehouseEntry.css';

const WarehouseEntry = () => {
    const { products, updateProduct, isLoading } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [boxes, setBoxes] = useState([{ length: '', width: '', height: '', weight: '' }]);
    const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error'
    const [auditCount, setAuditCount] = useState(0); // Track audits in this session
    const searchInputRef = useRef(null);
    const inputRefs = useRef({}); // Store refs for each input field

    // Auto-focus search on load
    useEffect(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
    }, [selectedProduct]);

    // Keyboard shortcuts for speed
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Ctrl+S or Cmd+S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (selectedProduct) {
                    handleSave();
                }
            }
            // Ctrl+N or Cmd+N to add box
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                if (selectedProduct) {
                    addBox();
                }
            }
            // Escape to cancel
            if (e.key === 'Escape' && selectedProduct) {
                setSelectedProduct(null);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [selectedProduct, boxes]);

    const handleSearch = (e) => {
        const term = e.target.value;
        setSearchTerm(term);

        // Auto-select if exact match found (e.g. barcode scan)
        if (term.length > 3) {
            const exactMatch = products.find(p =>
                p.skuCode.toLowerCase() === term.toLowerCase() ||
                p.productCode?.toLowerCase() === term.toLowerCase()
            );
            if (exactMatch) {
                selectProduct(exactMatch);
            }
        }
    };

    const selectProduct = (product) => {
        setSelectedProduct(product);
        setSearchTerm(''); // Clear search for next scan

        // Pre-fill existing audit data if available, or default to 1 box
        if (product.auditedBoxes && product.auditedBoxes.length > 0) {
            setBoxes(product.auditedBoxes);
        } else {
            setBoxes([{ length: '', width: '', height: '', weight: '' }]);
        }
    };

    const handleBoxChange = (index, field, value) => {
        const newBoxes = [...boxes];
        newBoxes[index] = { ...newBoxes[index], [field]: value };
        setBoxes(newBoxes);
    };

    // Handle Enter key to move to next field (faster data entry)
    const handleKeyDown = (e, boxIndex, field) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            // Define field order: length → width → height → weight
            const fieldOrder = ['length', 'width', 'height', 'weight'];
            const currentFieldIndex = fieldOrder.indexOf(field);

            if (currentFieldIndex < fieldOrder.length - 1) {
                // Move to next field in same box
                const nextField = fieldOrder[currentFieldIndex + 1];
                const nextInputKey = `box-${boxIndex}-${nextField}`;
                inputRefs.current[nextInputKey]?.focus();
            } else {
                // Last field (weight) - move to next box or save
                if (boxIndex < boxes.length - 1) {
                    // Move to first field of next box
                    const nextInputKey = `box-${boxIndex + 1}-length`;
                    inputRefs.current[nextInputKey]?.focus();
                } else {
                    // Last box, last field - trigger save
                    handleSave();
                }
            }
        }
    };

    const addBox = () => {
        setBoxes([...boxes, { length: '', width: '', height: '', weight: '' }]);
    };

    const removeBox = (index) => {
        const newBoxes = boxes.filter((_, i) => i !== index);
        setBoxes(newBoxes);
    };

    const calculateTotalWeight = () => {
        return boxes.reduce((sum, box) => sum + (parseFloat(box.weight) || 0), 0);
    };

    const handleSave = () => {
        if (!selectedProduct) return;

        // Basic validation
        const validBoxes = boxes.filter(b => b.length && b.width && b.height && b.weight);
        if (validBoxes.length === 0) {
            toast.warning('⚠️ Please enter dimensions for at least one box');
            return;
        }

        const totalWeight = calculateTotalWeight();
        const billedWeight = selectedProduct.billedTotalWeight || 0;
        const delta = totalWeight - billedWeight;

        // Save locally
        updateProduct({
            id: selectedProduct.id,
            auditedWeight: totalWeight,
            auditedBoxes: validBoxes.map((b, i) => ({ ...b, boxNumber: i + 1 })), // Ensure box numbers
            hasAudit: true,
            variations: {
                totalWeightDelta: delta,
                hasWeightChange: Math.abs(delta) > 0.01,
                hasDimensionChanges: true
            },
            // Economics
            costImpact: delta * (selectedProduct.shippingCostPerKg || 25) * (selectedProduct.soldsPerMonth || 0),
            soldsPerMonth: selectedProduct.soldsPerMonth || 0
        });

        // Increment audit count
        setAuditCount(prev => prev + 1);

        // Quick toast feedback
        toast.success(`✅ ${selectedProduct.skuCode} saved! (${auditCount + 1} audits)`, {
            autoClose: 1500,
            position: 'bottom-right'
        });

        // Quick transition to next product
        setTimeout(() => {
            setSelectedProduct(null); // Return to search
            setBoxes([{ length: '', width: '', height: '', weight: '' }]); // Reset boxes
            // Auto-focus search for barcode scan
            if (searchInputRef.current) {
                searchInputRef.current.focus();
            }
        }, 800); // Faster than 1500ms
    };

    // Filter suggestions based on search
    const suggestions = searchTerm.length > 1 && !selectedProduct
        ? products.filter(p =>
            p.skuCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.productName?.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5)
        : [];

    return (
        <div className="warehouse-entry">
            <div className="entry-header">
                <h2>📦 Warehouse Audit Entry</h2>
                <p>Scan or search for a product to enter dimensions</p>
                {auditCount > 0 && (
                    <div className="session-stats">
                        <span className="audit-count">✅ {auditCount} audits completed this session</span>
                    </div>
                )}
            </div>

            {!selectedProduct ? (
                <div className="search-section">
                    <input
                        ref={searchInputRef}
                        type="text"
                        className="main-search-input"
                        placeholder="Scan Barcode or Type SKU..."
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                    {suggestions.length > 0 && (
                        <div className="search-suggestions">
                            {suggestions.map(p => (
                                <div key={p.id} className="suggestion-item" onClick={() => selectProduct(p)}>
                                    <span className="sku">{p.skuCode}</span>
                                    <span className="name">{p.mtpSku?.name || p.productName}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="audit-form-container">
                    {/* Access to save status overlay */}
                    {saveStatus === 'success' && (
                        <div className="success-overlay">
                            <div className="success-message">
                                ✅ Audit Saved!
                            </div>
                        </div>
                    )}

                    <div className="product-summary">
                        <button className="back-btn" onClick={() => setSelectedProduct(null)}>← Back to Search</button>
                        <h3>{selectedProduct.skuCode}</h3>
                        <p>{selectedProduct.mtpSku?.name || selectedProduct.productName}</p>
                        <div className="current-stats">
                            <span>Current Billed Weight: <strong>{selectedProduct.billedTotalWeight?.toFixed(2)} kg</strong></span>
                            <span>Category: {selectedProduct.productCategory}</span>
                        </div>
                    </div>

                    <div className="box-inputs">
                        <h4>Enter Physical Dimensions & Weight</h4>
                        {boxes.map((box, index) => (
                            <div key={index} className="box-row">
                                <div className="box-label">Box {index + 1}</div>
                                <div className="input-group">
                                    <input
                                        ref={el => inputRefs.current[`box-${index}-length`] = el}
                                        type="number"
                                        placeholder="L (cm)"
                                        value={box.length}
                                        onChange={(e) => handleBoxChange(index, 'length', e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, index, 'length')}
                                        autoFocus={index === 0}
                                    />
                                    <input
                                        ref={el => inputRefs.current[`box-${index}-width`] = el}
                                        type="number"
                                        placeholder="W (cm)"
                                        value={box.width}
                                        onChange={(e) => handleBoxChange(index, 'width', e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, index, 'width')}
                                    />
                                    <input
                                        ref={el => inputRefs.current[`box-${index}-height`] = el}
                                        type="number"
                                        placeholder="H (cm)"
                                        value={box.height}
                                        onChange={(e) => handleBoxChange(index, 'height', e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, index, 'height')}
                                    />
                                    <input
                                        ref={el => inputRefs.current[`box-${index}-weight`] = el}
                                        type="number"
                                        step="0.01"
                                        placeholder="Weight"
                                        value={box.weight}
                                        onChange={(e) => handleBoxChange(index, 'weight', e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, index, 'weight')}
                                        className="weight-input"
                                    />
                                    <span className="unit-label">kg</span>
                                </div>
                                {boxes.length > 1 && (
                                    <button className="remove-box-btn" onClick={() => removeBox(index)} tabIndex="-1">×</button>
                                )}
                            </div>
                        ))}
                        <button className="add-box-btn" onClick={addBox}>+ Add Another Box</button>
                    </div>

                    <div className="total-summary">
                        Total Entered Weight: <strong>{calculateTotalWeight().toFixed(2)} kg</strong>
                        {selectedProduct.billedTotalWeight > 0 && (
                            <span className={`diff-badge ${calculateTotalWeight() - selectedProduct.billedTotalWeight > 0 ? 'bad' : 'good'}`}>
                                Diff: {(calculateTotalWeight() - selectedProduct.billedTotalWeight).toFixed(2)} kg
                            </span>
                        )}
                    </div>

                    <div className="keyboard-hints">
                        <span>⌨️ Tips: <strong>Enter</strong> = next field | <strong>Ctrl+S</strong> = save | <strong>Ctrl+N</strong> = add box | <strong>Esc</strong> = cancel</span>
                    </div>

                    <div className="action-footer">
                        <button className="cancel-btn" onClick={() => setSelectedProduct(null)}>Cancel</button>
                        <button className="save-btn" onClick={handleSave}>Save & Next</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WarehouseEntry;
