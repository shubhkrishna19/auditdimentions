// Excel Parser Service for Dimensions Audit Authenticator
import * as XLSX from 'xlsx';
import { createProduct, createEmptyBox, BoxType, AuditStatus } from '../models/Product';

// Parse the uploaded Excel file
export const parseExcelFile = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                const result = {
                    billing: [],
                    audit: [],
                    variance: [],
                    sheetNames: workbook.SheetNames
                };

                // Parse each sheet
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (sheetName.toLowerCase().includes('billing')) {
                        result.billing = jsonData;
                    } else if (sheetName.toLowerCase().includes('audit') && !sheetName.toLowerCase().includes('var')) {
                        result.audit = jsonData;
                    } else if (sheetName.toLowerCase().includes('var')) {
                        result.variance = jsonData;
                    }
                });

                resolve(result);
            } catch (error) {
                reject(new Error(`Failed to parse Excel file: ${error.message}`));
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
};

// Parse a value to number, handling empty/invalid values
const parseNumber = (value) => {
    if (value === undefined || value === null || value === '') return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
};

// Normalize weight values - handles inconsistent Excel formatting
// If value >= 1000, assume it's in grams and convert to kg
// Otherwise, assume it's already in kg
const normalizeWeight = (value) => {
    const num = parseNumber(value);
    if (num === 0) return 0;

    // If the number is >= 1000, it's likely in grams (e.g., 30000 = 30 kg)
    // Otherwise it's already in kg (e.g., 30 = 30 kg)
    return num >= 1000 ? num / 1000 : num;
};

// Parse box data from row columns
const parseBox = (row, startCol) => ({
    length: parseNumber(row[startCol]),
    breadth: parseNumber(row[startCol + 1]),
    height: parseNumber(row[startCol + 2]),
    weight: normalizeWeight(row[startCol + 3])  // Normalize weight
});

// Convert raw billing data to products
export const convertBillingData = (rawData) => {
    if (!rawData || rawData.length < 4) return [];

    // Skip header rows (first 3 rows based on the actual file structure)
    const dataRows = rawData.slice(3);

    return dataRows
        .filter(row => row[0] && row[0].toString().trim() !== '')
        .map(row => {
            const skuCode = row[0]?.toString().trim() || '';
            const boxType = row[1]?.toString().trim() === 'MB' ? BoxType.MULTI : BoxType.SINGLE;

            // Parse boxes - columns are structured as:
            // Box 1: cols 2-5 (L, B, H, Weight)
            // Box 2: cols 6-9
            // Box 3: cols 10-13
            const boxes = [
                parseBox(row, 2),
                parseBox(row, 6),
                parseBox(row, 10)
            ];

            // Volumetric weight is in column 15, total weight in 16
            // Apply normalization to handle both formats (30000 = 30kg, 30 = 30kg)
            const volumetricWeight = normalizeWeight(row[15]);
            const totalWeight = normalizeWeight(row[16]);
            const chargeableWeight = normalizeWeight(row[18]);

            // Remark is in the last column
            const remark = row[row.length - 1]?.toString() || '';

            return {
                skuCode,
                boxType,
                billing: {
                    boxes,
                    volumetricWeight,
                    totalWeight,
                    chargeableWeight
                },
                remark,
                status: remark.toLowerCase().includes('ok') ? AuditStatus.AUDITED : AuditStatus.PENDING
            };
        });
};

// Convert raw audit data to products
export const convertAuditData = (rawData) => {
    if (!rawData || rawData.length < 4) return [];

    const dataRows = rawData.slice(3);

    return dataRows
        .filter(row => row[0] && row[0].toString().trim() !== '')
        .map(row => {
            const skuCode = row[0]?.toString().trim() || '';
            const boxType = row[1]?.toString().trim() === 'MB' ? BoxType.MULTI : BoxType.SINGLE;

            const boxes = [
                parseBox(row, 2),
                parseBox(row, 6),
                parseBox(row, 10)
            ];

            // Apply normalization to handle both formats
            const volumetricWeight = normalizeWeight(row[14]);
            const totalWeight = normalizeWeight(row[15]);

            const remark = row[row.length - 1]?.toString() || '';

            return {
                skuCode,
                boxType,
                audit: {
                    boxes,
                    volumetricWeight,
                    totalWeight,
                    chargeableWeight: totalWeight
                },
                remark
            };
        });
};

// Merge billing and audit data into complete products
export const mergeProductData = (billingData, auditData) => {
    const auditMap = new Map();
    auditData.forEach(item => {
        auditMap.set(item.skuCode, item);
    });

    return billingData.map(billing => {
        const audit = auditMap.get(billing.skuCode);

        const product = createProduct({
            skuCode: billing.skuCode,
            boxType: billing.boxType,
            billing: billing.billing,
            audit: audit?.audit || {
                boxes: [createEmptyBox(), createEmptyBox(), createEmptyBox()],
                volumetricWeight: 0,
                totalWeight: 0,
                chargeableWeight: 0
            },
            status: audit ? AuditStatus.AUDITED : AuditStatus.PENDING,
            remark: audit?.remark || billing.remark
        });

        return product;
    });
};

// Parse and process complete Excel file
export const processExcelFile = async (file) => {
    const rawData = await parseExcelFile(file);

    const billingProducts = convertBillingData(rawData.billing);
    const auditProducts = convertAuditData(rawData.audit);

    const mergedProducts = mergeProductData(billingProducts, auditProducts);

    // Calculate variance for each product
    const productsWithVariance = mergedProducts.map(product => {
        const billingWeight = product.billing.totalWeight;
        const auditWeight = product.audit.totalWeight;

        const weightDiff = billingWeight - auditWeight;
        const percentageDiff = billingWeight > 0
            ? ((weightDiff / billingWeight) * 100)
            : 0;

        return {
            ...product,
            variance: {
                weightDiff,
                percentageDiff,
                hasVariance: Math.abs(percentageDiff) > 0.1
            }
        };
    });

    return {
        products: productsWithVariance,
        summary: {
            total: productsWithVariance.length,
            audited: productsWithVariance.filter(p => p.status === AuditStatus.AUDITED).length,
            pending: productsWithVariance.filter(p => p.status === AuditStatus.PENDING).length,
            withVariance: productsWithVariance.filter(p => p.variance.hasVariance).length
        }
    };
};

// Export products to Excel
export const exportToExcel = (products, filename = 'audit_report.xlsx') => {
    const exportData = products.map(p => ({
        'SKU Code': p.skuCode,
        'Box Type': p.boxType,
        'Status': p.status,
        'Billing Weight (kg)': p.billing.totalWeight.toFixed(2),
        'Audit Weight (kg)': p.audit.totalWeight.toFixed(2),
        'Variance (kg)': p.variance.weightDiff.toFixed(2),
        'Variance %': p.variance.percentageDiff?.toFixed(2),
        'Remark': p.remark
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Report');

    XLSX.writeFile(workbook, filename);
};

export default {
    parseExcelFile,
    convertBillingData,
    convertAuditData,
    mergeProductData,
    processExcelFile,
    exportToExcel
};
