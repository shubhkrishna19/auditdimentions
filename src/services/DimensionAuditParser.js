// Dimension Audit Parser - Handles Audit_Dimensions.csv and DimentionsMasterAudit.xlsx
import * as XLSX from 'xlsx';

// Parse number safely - handles various formats including "95 kg", "1,234.56", etc.
const parseNum = (val) => {
    if (val === undefined || val === null || val === '') return 0;

    // Handle string numbers with commas, spaces, units (kg, g, cm)
    if (typeof val === 'string') {
        // Keep only digits and decimal points
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
        .replace(/^(SKU|CODE|PART|MTP)[:\s-.]+/i, '') // Remove common "SKU:", "Code:" prefixes
        .replace(/\s+/g, '-')  // Replace spaces with hyphens
        .replace(/[_]/g, '-')  // Replace underscores with hyphens
        .replace(/-+/g, '-')   // Replace multiple hyphens with single
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Parse Audit_Dimensions.csv or DimentionsMasterAudit.xlsx
 * Format:
 * - Column 0: MTP SKU Code
 * - Column 1: SB/MB (Single/Multi Box)
 * - Columns 2-5: Box 1 (Long, Med, Smal, Actual.Wht in grams)
 * - Columns 6-9: Box 2 (Long, Med, Smal, Actual.Wht in grams)
 * - Columns 10-13: Box 3 (Long, Med, Smal, Actual.Wht in grams)
 * - Column 14: Vol.Wht
 * - Column 15: Total Weight (Actual.Wht in grams)
 * - Column 16: Wht (Kgs)
 */
export const parseDimensionAudit = async (file) => {
    return new Promise((resolve, reject) => {
        console.log('[DimensionParser] Starting dimension audit parse...', file.name);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                console.log('📖 File loaded, parsing...');
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                console.log('📊 Workbook sheets:', workbook.SheetNames);

                // Get first sheet
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                console.log('📋 Total rows:', jsonData.length);
                console.log('📋 First rows:', jsonData.slice(0, 5));

                // Find header row dynamically (usually within first 10 rows)
                let headerRowIndex = -1;
                for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
                    const row = jsonData[i];
                    if (row && row.some(cell => {
                        const cellText = cell?.toString().toLowerCase() || '';
                        return cellText.includes('sku') || cellText.includes('product code');
                    })) {
                        headerRowIndex = i;
                        console.log(`🎯 Found header at row ${i}:`, row);
                        break;
                    }
                }

                // If no header found, default to skipping 3 as before, or use row 0 if it looks like data
                const actualHeaderIndex = headerRowIndex !== -1 ? headerRowIndex : 2;
                const dataRows = jsonData.slice(actualHeaderIndex + 1);
                console.log(`📋 Processing data from row ${actualHeaderIndex + 2} onwards (${dataRows.length} rows)`);

                const products = dataRows
                    .filter(row => row[0] && row[0].toString().trim() !== '')
                    .map((row, index) => {
                        const skuCode = normalizeSKU(row[0]);
                        const boxType = row[1]?.toString().trim() || '';

                        // Parse boxes - dimensions in cm, weight in grams
                        const boxes = [];

                        // Box 1 (columns 2-5)
                        if (parseNum(row[2]) > 0) {
                            boxes.push({
                                boxNumber: 1,
                                length: parseNum(row[2]),
                                width: parseNum(row[3]),
                                height: parseNum(row[4]),
                                weight: parseNum(row[5]) / 1000 // grams to kg
                            });
                        }

                        // Box 2 (columns 6-9)
                        if (parseNum(row[6]) > 0) {
                            boxes.push({
                                boxNumber: 2,
                                length: parseNum(row[6]),
                                width: parseNum(row[7]),
                                height: parseNum(row[8]),
                                weight: parseNum(row[9]) / 1000 // grams to kg
                            });
                        }

                        // Box 3 (columns 10-13)
                        if (parseNum(row[10]) > 0) {
                            boxes.push({
                                boxNumber: 3,
                                length: parseNum(row[10]),
                                width: parseNum(row[11]),
                                height: parseNum(row[12]),
                                weight: parseNum(row[13]) / 1000 // grams to kg
                            });
                        }

                        // Total weight from column 16 (in grams, need to convert to kg)
                        // Column 15 is Total Weight in grams, Column 16 is Wht(Kgs) but might also be in grams
                        const totalWeight = parseNum(row[16]) > 1000
                            ? parseNum(row[16]) / 1000  // If > 1000, it's in grams
                            : parseNum(row[16]);         // Otherwise already in kg

                        return {
                            skuCode,
                            boxType,
                            boxes,
                            totalWeight,
                            volumetricWeight: parseNum(row[14]),
                            remark: row[row.length - 1]?.toString() || ''
                        };
                    });

                console.log('[DimensionParser] Parsed products:', products.length);
                console.log('[DimensionParser] Sample product:', products[0]);
                resolve(products);
            } catch (error) {
                console.error('[DimensionParser] Parse error:', error);
                reject(new Error(`Failed to parse dimension audit file: ${error.message}`));
            }
        };

        reader.onerror = () => {
            console.error('❌ File read error');
            reject(new Error('Failed to read file'));
        };
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Calculate dimension variations between billed (CRM) and audited data
 */
export const calculateDimensionVariations = (crmProducts, auditedProducts) => {
    console.log('[DimensionParser] Calculating variations...');
    console.log('[DimensionParser] CRM Products:', crmProducts.length);
    console.log('[DimensionParser] Audited Products:', auditedProducts.length);

    // Create map of audited products by normalized SKU
    const auditMap = new Map();
    auditedProducts.forEach(audit => {
        const normalizedSKU = normalizeSKU(audit.skuCode);
        auditMap.set(normalizedSKU, audit);
        console.log(`[Audit SKU] Original: "${audit.skuCode}" → Normalized: "${normalizedSKU}"`);
    });

    console.log('[DimensionParser] Audit map size:', auditMap.size);
    console.log('[DimensionParser] Audit SKUs:', Array.from(auditMap.keys()).slice(0, 10));

    // Debug CRM SKU fields
    console.log('[DimensionParser] First 3 CRM products:', crmProducts.slice(0, 3).map(p => ({
        id: p.id,
        skuCode: p.skuCode,
        productCode: p.productCode,
        productName: p.productName,
        normalized: normalizeSKU(p.skuCode || p.productCode)
    })));

    console.log('[DimensionParser] CRM SKUs (normalized):',
        crmProducts.slice(0, 10).map(p => normalizeSKU(p.skuCode || p.productCode)));

    const results = crmProducts.map(crmProduct => {
        const normalizedCRMSKU = normalizeSKU(crmProduct.skuCode || crmProduct.productCode);
        const audit = auditMap.get(normalizedCRMSKU);

        if (!audit) {
            console.log(`[No Match] CRM SKU: "${crmProduct.skuCode || crmProduct.productCode}" → Normalized: "${normalizedCRMSKU}" - Not found in audit data`);
            return {
                ...crmProduct,
                hasAudit: false,
                variations: null
            };
        }

        console.log(`[Match Found] CRM SKU: "${crmProduct.skuCode || crmProduct.productCode}" ↔ Audit SKU: "${audit.skuCode}"`);

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

        // Calculate total weight variation
        const billedWeight = crmProduct.billedTotalWeight || 0;
        const auditedWeight = audit.totalWeight || 0;
        const weightVariance = auditedWeight - billedWeight;
        const weightVariancePercent = billedWeight > 0
            ? ((weightVariance / billedWeight) * 100).toFixed(2)
            : 0;

        return {
            ...crmProduct,
            hasAudit: true,
            auditedWeight: auditedWeight,
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

    const withAudit = results.filter(r => r.hasAudit).length;
    console.log('[DimensionParser] Results:', results.length, `(${withAudit} with audit data)`);

    return results;
};

export default {
    parseDimensionAudit,
    calculateDimensionVariations
};
