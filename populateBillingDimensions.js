/**
 * Bulk Population Script - Sync Billing Dimensions to Zoho CRM
 * Reads DimensionsMasterLatest.xlsx and populates all products
 */

import XLSX from 'xlsx';
import fs from 'fs';

const VOLUMETRIC_DIVISOR = 5000;
const WEIGHT_BRACKETS = [5, 10, 20, 50, 100, 500];

function getWeightCategory(weightKg) {
    for (const bracket of WEIGHT_BRACKETS) {
        if (weightKg <= bracket) return `${bracket}kg`;
    }
    return '500kg+';
}

function parseBillingDimensions(filePath) {
    console.log('[BulkPopulate] Reading Excel file:', filePath);

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Billing Dimensions'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`[BulkPopulate] Total rows in sheet: ${data.length}`);

    // Skip first 3 rows (headers/units), start from row 4 (index 3)
    const products = [];

    for (let i = 3; i < data.length; i++) {
        const row = data[i];

        const sku = row[0]?.toString().trim();
        if (!sku) continue;

        const boxes = [];
        const boxCols = [[2, 3, 4, 5], [6, 7, 8, 9], [10, 11, 12, 13]];

        boxCols.forEach((cols, idx) => {
            const L = parseFloat(row[cols[0]]) || 0;
            if (L > 0) {
                boxes.push({
                    length: L,
                    width: parseFloat(row[cols[1]]) || 0,
                    height: parseFloat(row[cols[2]]) || 0,
                    weight: parseFloat(row[cols[3]]) || 0 // Always Grams in Excel
                });
            }
        });

        const totalPhysicalGrams = boxes.reduce((sum, b) => sum + b.weight, 0);
        const totalVolumetricGrams = boxes.reduce((sum, b) => sum + (b.length * b.width * b.height) / 5, 0);
        const maxGrams = Math.max(totalPhysicalGrams, totalVolumetricGrams);
        const status = row[19]?.toString().trim() || 'Y';

        products.push({
            skuCode: sku,
            boxes: boxes,
            totalWeightKg: maxGrams / 1000,
            physicalWeightGrams: totalPhysicalGrams,
            volumetricWeightGrams: totalVolumetricGrams,
            category: getWeightCategory(maxGrams / 1000),
            status: status
        });

        if ((i - 2) % 100 === 0) console.log(`[Bulk] Parsed ${i - 2} rows...`);
    }
    console.log(`[Bulk] Final Count: ${products.length}`);
    return products;
}

function generateReport(products) {
    const report = {
        totalProducts: products.length,
        byCategory: {},
        weightStats: { min: Infinity, max: -Infinity, sum: 0 }
    };

    products.forEach(p => {
        report.byCategory[p.category] = (report.byCategory[p.category] || 0) + 1;
        if (p.totalWeightKg < report.weightStats.min) report.weightStats.min = p.totalWeightKg;
        if (p.totalWeightKg > report.weightStats.max) report.weightStats.max = p.totalWeightKg;
        report.weightStats.sum += p.totalWeightKg;
    });

    return report;
}

// Export for use in Zoho widget
function saveForZoho(products) {
    const outputPath = './parsed_billing_dimensions.json';
    fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));
    console.log(`[BulkPopulate] Saved ${products.length} products to ${outputPath}`);
    console.log('[BulkPopulate] Ready to sync to Zoho CRM!');
}

// Main execution
const filePath = process.argv[2] || './DimensionsMasterLatest.xlsx';

try {
    const products = parseBillingDimensions(filePath);
    const report = generateReport(products);

    console.log('\n' + '='.repeat(80));
    console.log('BULK POPULATION REPORT');
    console.log('='.repeat(80));
    console.log(`Total Products: ${report.totalProducts}`);
    console.log(`\nWeight Categories:`);
    Object.entries(report.byCategory).sort().forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} products`);
    });
    console.log(`\nChargeable Weight Stats:`);
    console.log(`  Min: ${report.weightStats.min === Infinity ? 0 : report.weightStats.min.toFixed(2)} kg`);
    console.log(`  Max: ${report.weightStats.max === -Infinity ? 0 : report.weightStats.max.toFixed(2)} kg`);
    console.log(`  Avg: ${(report.weightStats.sum / report.totalProducts || 0).toFixed(2)} kg`);
    console.log('='.repeat(80));

    saveForZoho(products);

    // Show first 3 products as sample
    console.log('\nSample Products (first 3):');
    products.slice(0, 3).forEach((p, idx) => {
        console.log(`\n${idx + 1}. ${p.skuCode}`);
        console.log(`   Boxes: ${p.boxes.length}`);
        console.log(`   Target Weight: ${p.totalWeightKg.toFixed(3)} kg`);
        console.log(`   Category: ${p.category}`);
    });

    console.log('\n✅ Parsing complete! Output: parsed_billing_dimensions.json');

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
}
