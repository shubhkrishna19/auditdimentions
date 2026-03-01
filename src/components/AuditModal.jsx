import React, { useState, useEffect } from 'react';
import './AuditModal.css';

const AuditModal = ({ product, onClose, onSave }) => {
    // Initialize state with existing boxes or default 3 empty rows
    const [boxes, setBoxes] = useState(() => {
        const initialBoxes = product.boxes?.length > 0
            ? product.boxes.map(b => ({ ...b }))
            : [{ boxNumber: 1, length: 0, width: 0, height: 0, weight: 0 }];

        // Ensure at least 3 slots available as per Excel template, but only show what's needed
        if (initialBoxes.length < 3) {
            for (let i = initialBoxes.length + 1; i <= 3; i++) {
                initialBoxes.push({ boxNumber: i, length: 0, width: 0, height: 0, weight: 0 });
            }
        }
        return initialBoxes;
    });

    const [volumetricDivisor, setVolumetricDivisor] = useState(5000); // Standard

    // Totals
    const [totals, setTotals] = useState({
        totalVolumeCBM: 0,
        totalVolumetricWeight: 0,
        totalPhysicalWeight: 0,
        chargeableWeight: 0
    });

    useEffect(() => {
        calculateTotals();
    }, [boxes, volumetricDivisor]);

    const calculateTotals = () => {
        let totalVolCBM = 0;
        let totalVolWeight = 0;
        let totalPhysWeight = 0;

        boxes.forEach(box => {
            const l = parseFloat(box.length) || 0;
            const w = parseFloat(box.width) || 0;
            const h = parseFloat(box.height) || 0;
            const wt = parseFloat(box.weight) || 0;

            // CBM: (L*W*H) / 1,000,000 (cm to m3)
            const volCBM = (l * w * h) / 1000000;
            totalVolCBM += volCBM;

            // Volumetric Weight: (L*W*H) / 5000 (kg)
            const volWt = (l * w * h) / volumetricDivisor;
            totalVolWeight += volWt;

            totalPhysWeight += wt;
        });

        const chargeable = Math.max(totalVolWeight, totalPhysWeight);

        setTotals({
            totalVolumeCBM: totalVolCBM,
            totalVolumetricWeight: totalVolWeight,
            totalPhysicalWeight: totalPhysWeight,
            chargeableWeight: chargeable
        });
    };

    const handleBoxChange = (index, field, value) => {
        const newBoxes = [...boxes];
        newBoxes[index] = { ...newBoxes[index], [field]: value };
        setBoxes(newBoxes);
    };

    const handleSubmit = () => {
        const entry = {
            productId: product.id,
            sku: product.productCode,
            auditDate: new Date().toISOString(),
            boxes: boxes.filter(b => b.length > 0 || b.weight > 0), // Filter empty
            totals: totals
        };
        onSave(entry);
    };

    return (
        <div className="audit-modal-overlay">
            <div className="audit-modal">
                <div className="audit-modal-header">
                    <h2>Audit Dimensions: {product.productCode}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="audit-modal-body">
                    <div className="audit-grid">
                        <div className="audit-row header">
                            <span>Box</span>
                            <span>Length (cm)</span>
                            <span>Width (cm)</span>
                            <span>Height (cm)</span>
                            <span>Actual Weight (kg)</span>
                            <span>Volumetric (kg)</span>
                        </div>

                        {boxes.map((box, idx) => (
                            <div key={idx} className="audit-row">
                                <span className="box-label">Box {box.boxNumber}</span>
                                <input
                                    type="number"
                                    value={box.length || ''}
                                    onChange={(e) => handleBoxChange(idx, 'length', e.target.value)}
                                    placeholder="L"
                                />
                                <input
                                    type="number"
                                    value={box.width || ''}
                                    onChange={(e) => handleBoxChange(idx, 'width', e.target.value)}
                                    placeholder="W"
                                />
                                <input
                                    type="number"
                                    value={box.height || ''}
                                    onChange={(e) => handleBoxChange(idx, 'height', e.target.value)}
                                    placeholder="H"
                                />
                                <input
                                    type="number"
                                    value={box.weight || ''}
                                    onChange={(e) => handleBoxChange(idx, 'weight', e.target.value)}
                                    placeholder="Wt"
                                />
                                <span className="read-only">
                                    {((box.length * box.width * box.height) / volumetricDivisor).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="results-summary">
                        <div className="result-card">
                            <span className="label">Total Volumetric Wt</span>
                            <span className="value">{totals.totalVolumetricWeight.toFixed(2)} kg</span>
                            <small>({totals.totalVolumeCBM.toFixed(4)} CBM)</small>
                        </div>
                        <div className="result-card">
                            <span className="label">Total Physical Wt</span>
                            <span className="value">{totals.totalPhysicalWeight.toFixed(2)} kg</span>
                        </div>
                        <div className="result-card highlight">
                            <span className="label">Chargeable Weight</span>
                            <span className="value">{totals.chargeableWeight.toFixed(2)} kg</span>
                            <small>{totals.chargeableWeight === totals.totalVolumetricWeight ? '(Volumetric)' : '(Physical)'}</small>
                        </div>
                    </div>
                </div>

                <div className="audit-modal-footer">
                    <div className="comparison">
                        <span>Current Billed: <strong>{product.billedTotalWeight?.toFixed(2) || 0} kg</strong></span>
                        <span className={totals.chargeableWeight > product.billedTotalWeight ? 'diff-negative' : 'diff-positive'}>
                            Diff: {(totals.chargeableWeight - (product.billedTotalWeight || 0)).toFixed(2)} kg
                        </span>
                    </div>
                    <div className="actions">
                        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>Save Audit</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditModal;
