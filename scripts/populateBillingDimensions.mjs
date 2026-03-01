/**
 * Bulk Population Script - Sync Billing Dimensions to Zoho CRM
 * Reads DimensionsMasterLatest.xlsx and populates all products
 */

import * as XLSX from 'xlsx';
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

        // Column A: SKU Code
        const sku = row[0]?.toString().trim();
        if (!sku) {
            console.log(`[BulkPopulate] Row ${i + 1}: Skipping empty SKU`);
            continue;
        }

        // Column B: SB/MB indicator
        const boxType = row[1]?.toString().trim() || '';

        // Parse boxes with proper unit conversion
        const boxes = [];

        // Box 1 (Columns C-F: Length, Width, Height cm, Weight grams)
        const box1L = parseFloat(row[2]) || 0;
        if (box1L > 0) {
            boxes.push({
                Box_Number: 1,
                Box_Measurement: 'cm',
                Length: box1L,
                Width: parseFloat(row[3]) || 0,
                Height: parseFloat(row[4]) || 0,
                Weight_Measurement: 'kg',
                Weight: (parseFloat(row[5]) || 0) / 1000 // GRAMS TO KG
            });
        }

        // Box 2 (Columns G-J)
        const box2L = parseFloat(row[6]) || 0;
        if (box2L > 0) {
            boxes.push({
                Box_Number: 2,
                Box_Measurement: 'cm',
                Length: box2L,
                Width: parseFloat(row[7]) || 0,
                Height: parseFloat(row[8]) || 0,
                Weight_Measurement: 'kg',
                Weight: (parseFloat(row[9]) || 0) / 1000 // GRAMS TO KG
            });
        }

        // Box 3 (Columns K-N)
        const box3L = parseFloat(row[10]) || 0;
        if (box3L > 0) {
            boxes.push({
                Box_Number: 3,
                Box_Measurement: 'cm',
                Length: box3L,
                Width: parseFloat(row[11]) || 0,
                Height: parseFloat(row[12]) || 0,
                Weight_Measurement: 'kg',
                Weight: (parseFloat(row[13]) || 0) / 1000 // GRAMS TO KG
            });
        }

        // Calculate weights - ALL IN KG FOR PROPER COMPARISON
        let totalVolumetricKg = 0;
        let totalPhysicalKg = 0;

        boxes.forEach(box => {
            // Volumetric Weight: (L×W×H in cm³) / 5000 = kg
            const volWeightKg = (box.Length * box.Width * box.Height) / VOLUMETRIC_DIVISOR;
            totalVolumetricKg += volWeightKg;

            // Physical weight already in kg
            totalPhysicalKg += box.Weight;
        });

        // Chargeable = MAX (both in KG, proper comparison!)
        const chargeableWeightKg = Math.max(totalVolumetricKg, totalPhysicalKg);

        // BOM Weight from Column S (grams) → convert to kg
        const bomWeightKg = (parseFloat(row[18]) || 0) / 1000;

        // Status from Column T
        const status = row[19]?.toString().trim() || '';

        const productData = {
            Product_Code: sku,
            Bill_Dimension_Weight: boxes,

            // All weights in KG
            Billed_Physical_Weight: parseFloat(totalPhysicalKg.toFixed(3)),
            Billed_Volumetric_Weight: parseFloat(totalVolumetricKg.toFixed(3)),
            Billed_Chargeable_Weight: parseFloat(chargeableWeightKg.toFixed(3)),
            BOM_Weight: parseFloat(bomWeightKg.toFixed(3)),
            Total_Weight: parseFloat(chargeableWeightKg.toFixed(3)),

            Weight_Category_Billed: getWeightCategory(chargeableWeightKg),
            Processing_Status: status
        };

        products.push(productData);

        if ((i - 2) % 50 === 0) {
            console.log(`[BulkPopulate] Processed ${i - 2} products...`);
        }
    }

    console.log(`[BulkPopulate] Successfully parsed ${products.length} products`);
    return products;
}

// Generate summary report
function generateReport(products) {
    const report = {
        totalProducts: products.length,
        byCategory: {},
        boxDistribution: { single: 0, multi: 0 },
        weightStats: {
            minChargeable: Math.min(...products.map(p => p.Billed_Chargeable_Weight)),
            maxChargeable: Math.max(...products.map(p => p.Billed_Chargeable_Weight)),
            avgChargeable: products.reduce((sum, p) => sum + p.Billed_Chargeable_Weight, 0) / products.length
        }
    };

    products.forEach(p => {
        const cat = p.Weight_Category_Billed;
        report.byCategory[cat] = (report.byCategory[cat] || 0) + 1;

        if (p.Bill_Dimension_Weight.length === 1) report.boxDistribution.single++;
        else report.boxDistribution.multi++;
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
    console.log(`\nBox Distribution:`);
    console.log(`  Single Box: ${report.boxDistribution.single}`);
    console.log(`  Multi Box: ${report.boxDistribution.multi}`);
    console.log(`\nChargeable Weight Stats:`);
    console.log(`  Min: ${report.weightStats.minChargeable.toFixed(2)} kg`);
    console.log(`  Max: ${report.weightStats.maxChargeable.toFixed(2)} kg`);
    console.log(`  Avg: ${report.weightStats.avgChargeable.toFixed(2)} kg`);
    console.log('='.repeat(80));

    saveForZoho(products);

    console.log('\n✅ Ready for Zoho sync! Next step: Run Zoho API update script');

} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
