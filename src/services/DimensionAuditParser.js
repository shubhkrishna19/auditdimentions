// Dimension Audit Parser - Handles Audit_Dimensions.csv and DimentionsMasterAudit.xlsx
import * as XLSX from 'xlsx';

// Parse number safely - handles various formats including "95 kg", "1,234.56", etc.
const parseNum = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'string') {
        val = val.replace(/[^\d.]/g, '').trim();
    }
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
};

// Normalize SKU for matching - removes spaces, converts to uppercase, handles special chars and common prefixes
const normalizeSKU = (sku) => {
    if (!sku) return '';
    return sku.toString()
        .trim()
        .toUpperCase()
        .replace(/^(SKU|CODE|PART|MTP)[:\s-.]+/i, '')
        .replace(/\s+/g, '-')
        .replace(/[_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
};

/**
 * Parse Audit_Dimensions.csv or DimentionsMasterAudit.xlsx
 */
export const parseDimensionAudit = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                // Find header row dynamically (usually within first 10 rows)
                let headerRowIndex = -1;
                for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
                    const row = jsonData[i];
                    if (row && row.some(cell => {
                        const cellText = cell?.toString().toLowerCase() || '';
                        return cellText.includes('sku') || cellText.includes('product code');
                    })) {
                        headerRowIndex = i;
                        break;
                    }
                }

                const actualHeaderIndex = headerRowIndex !== -1 ? headerRowIndex : 2;
                const dataRows = jsonData.slice(actualHeaderIndex + 1);

                const products = dataRows
                    .filter(row => row[0] && row[0].toString().trim() !== '')
                    .map((row) => {
                        const skuCode = normalizeSKU(row[0]);
                        const boxType = row[1]?.toString().trim() || '';
                        const boxes = [];

                        // Box 1 (columns 2-5)
                        if (parseNum(row[2]) > 0) {
                            boxes.push({
                                boxNumber: 1,
                                length: parseNum(row[2]),
                                width: parseNum(row[3]),
                                height: parseNum(row[4]),
                                weight: parseNum(row[5]) / 1000
                            });
                        }

                        // Box 2 (columns 6-9)
                        if (parseNum(row[6]) > 0) {
                            boxes.push({
                                boxNumber: 2,
                                length: parseNum(row[6]),
                                width: parseNum(row[7]),
                                height: parseNum(row[8]),
                                weight: parseNum(row[9]) / 1000
                            });
                        }

                        // Box 3 (columns 10-13)
                        if (parseNum(row[10]) > 0) {
                            boxes.push({
                                boxNumber: 3,
                                length: parseNum(row[10]),
                                width: parseNum(row[11]),
                                height: parseNum(row[12]),
                                weight: parseNum(row[13]) / 1000
                            });
                        }

                        // Total weight from column 16
                        const totalWeight = parseNum(row[16]) > 1000
                            ? parseNum(row[16]) / 1000
                            : parseNum(row[16]);

                        return { skuCode, boxType, boxes, totalWeight, volumetricWeight: parseNum(row[14]) };
                    });

                resolve(products);
            } catch (error) {
                reject(new Error(`Failed to parse audit file: ${error.message}`));
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Calculate dimension variations between billed (CRM) and audited data
 */
export const calculateDimensionVariations = (crmProducts, auditedProducts) => {
    // Create map of audited products by normalized SKU
    const auditMap = new Map();
    auditedProducts.forEach(audit => {
        auditMap.set(normalizeSKU(audit.skuCode), audit);
    });

    const results = crmProducts.map(crmProduct => {
        const normalizedCRMSKU = normalizeSKU(crmProduct.skuCode || crmProduct.productCode);
        const audit = auditMap.get(normalizedCRMSKU);

        if (!audit) {
            return { ...crmProduct, hasAudit: false, variations: null };
        }

        // Calculate box-by-box variations
        const boxVariations = [];
        const maxBoxes = Math.max(crmProduct.boxes?.length || 0, audit.boxes?.length || 0);

        for (let i = 0; i < maxBoxes; i++) {
            const crmBox = crmProduct.boxes?.[i];
            const auditBox = audit.boxes?.[i];

            if (crmBox && auditBox) {
                boxVariations.push({
                    boxNumber: i + 1,
                    deltaLength: auditBox.length - (crmBox.length || 0),
                    deltaWidth: auditBox.width - (crmBox.width || 0),
                    deltaHeight: auditBox.height - (crmBox.height || 0),
                    deltaWeight: auditBox.weight - (crmBox.weight || 0),
                    billedDims: `${crmBox.length}×${crmBox.width}×${crmBox.height}`,
                    auditedDims: `${auditBox.length}×${auditBox.width}×${auditBox.height}`,
                    hasDimensionChange:
                        auditBox.length !== crmBox.length ||
                        auditBox.width !== crmBox.width ||
                        auditBox.height !== crmBox.height
                });
            }
        }

        const billedWeight = crmProduct.billedTotalWeight || 0;
        const auditedWeight = audit.totalWeight || 0;
        const weightVariance = auditedWeight - billedWeight;
        const weightVariancePercent = billedWeight > 0
            ? ((weightVariance / billedWeight) * 100).toFixed(2)
            : 0;

        return {
            ...crmProduct,
            hasAudit: true,
            auditedWeight,
            auditedBoxes: audit.boxes,
            variations: {
                boxes: boxVariations,
                totalWeightDelta: weightVariance,
                totalWeightDeltaPercent: weightVariancePercent,
                hasDimensionChanges: boxVariations.some(b => b.hasDimensionChange),
                hasWeightChange: Math.abs(weightVariance) > 0.1
            }
        };
    });

    return results;
};

export default { parseDimensionAudit, calculateDimensionVariations };
