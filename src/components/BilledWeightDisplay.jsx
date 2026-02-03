import './BilledWeightDisplay.css';

const BilledWeightDisplay = ({ productData, calculatedData, onRefresh }) => {
    if (!productData) {
        return (
            <div className="billed-weight-display no-data">
                <div className="header">
                    <h4>📊 Billed Weight (Zoho SSOT)</h4>
                    {onRefresh && (
                        <button className="btn-refresh" onClick={onRefresh}>
                            🔄 Refresh
                        </button>
                    )}
                </div>
                <p className="empty-state">
                    No data from Zoho. Product may need to be synced first.
                </p>
            </div>
        );
    }

    // Check for mismatches between calculated and billed
    const hasMismatch = calculatedData && productData.billedChargeableWeight &&
        Math.abs(calculatedData.chargeableWeight - productData.billedChargeableWeight) > 0.01;

    return (
        <div className="billed-weight-display">
            <div className="header">
                <h4>📊 Billed Weight (Zoho SSOT)</h4>
                <div className="header-actions">
                    <span className="sync-badge">✅ From Zoho</span>
                    {onRefresh && (
                        <button className="btn-refresh" onClick={onRefresh} title="Refresh from Zoho">
                            🔄
                        </button>
                    )}
                </div>
            </div>

            {/* Main Billed Weight - Highlighted */}
            <div className="weight-card primary">
                <div className="weight-card-header">
                    <span className="label">Billed Chargeable Weight:</span>
                    <span className="value large">
                        {productData.billedChargeableWeight ?
                            productData.billedChargeableWeight.toFixed(3) : '—'
                        } kg
                    </span>
                </div>
                <div className="weight-category">
                    Category: <strong>{productData.weightCategory || '—'}</strong>
                </div>
            </div>

            {/* Mismatch Warning */}
            {hasMismatch && (
                <div className="mismatch-warning">
                    ⚠️ Calculated ({calculatedData.chargeableWeight.toFixed(3)} kg) differs from billed
                    ({productData.billedChargeableWeight.toFixed(3)} kg)
                </div>
            )}

            {/* Detailed Weights */}
            <div className="weight-details">
                <div className="weight-row">
                    <span className="label">Physical Weight:</span>
                    <span className="value">
                        {productData.billedPhysicalWeight ?
                            productData.billedPhysicalWeight.toFixed(3) : '—'
                        } kg
                    </span>
                </div>
                <div className="weight-row">
                    <span className="label">Volumetric Weight:</span>
                    <span className="value">
                        {productData.billedVolumetricWeight ?
                            productData.billedVolumetricWeight.toFixed(3) : '—'
                        } kg
                    </span>
                </div>
                <div className="weight-row">
                    <span className="label">BOM Weight:</span>
                    <span className="value">
                        {productData.bomWeight ?
                            productData.bomWeight.toFixed(3) : '—'
                        } kg
                    </span>
                </div>
                <div className="weight-row">
                    <span className="label">Total Weight:</span>
                    <span className="value">
                        {productData.totalWeight ?
                            productData.totalWeight.toFixed(3) : '—'
                        } kg
                    </span>
                </div>
            </div>

            {/* Box Dimensions */}
            {productData.boxes && productData.boxes.length > 0 && (
                <div className="box-dimensions">
                    <h5>📦 Box Dimensions</h5>
                    <table className="box-table">
                        <thead>
                            <tr>
                                <th>Box</th>
                                <th>Dimensions (cm)</th>
                                <th>Weight (kg)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productData.boxes.map((box, idx) => (
                                <tr key={idx}>
                                    <td>Box {box.boxNumber}</td>
                                    <td>{box.length} × {box.width} × {box.height}</td>
                                    <td>{box.weight ? box.weight.toFixed(3) : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Metadata */}
            <div className="metadata">
                <small className="last-synced">
                    Last fetched: {new Date(productData.lastSynced).toLocaleTimeString()}
                </small>
                <small className="zoho-id">
                    Zoho ID: {productData.zohoId}
                </small>
            </div>
        </div>
    );
};

export default BilledWeightDisplay;
