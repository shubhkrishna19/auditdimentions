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

        // Column A: SKU Code
        const sku = row[0]?.toString().trim();
        if (!sku) {
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
                Weight_Measurement: 'Gram',  // Store as Gram to match Zoho
                Weight: parseFloat(row[5]) || 0  // Keep in GRAMS (no conversion)
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
                Weight_Measurement: 'Gram',
                Weight: parseFloat(row[9]) || 0  // Keep in GRAMS
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
                Weight_Measurement: 'Gram',
                Weight: parseFloat(row[13]) || 0  // Keep in GRAMS
            });
        }

        // Calculate weights - ALL IN GRAMS for storage in Zoho
        let totalVolumetricGrams = 0;
        let totalPhysicalGrams = 0;

        boxes.forEach(box => {
            // Volumetric Weight: (L×W×H in cm³) / 5 = grams
            // (Standard formula: divide by 5000 for kg, divide by 5 for grams)
            const volWeightGrams = (box.Length * box.Width * box.Height) / 5;
            totalVolumetricGrams += volWeightGrams;

            // Physical weight already in grams
            totalPhysicalGrams += box.Weight;
        });

        // Chargeable = MAX (both in GRAMS)
        const chargeableWeightGrams = Math.max(totalVolumetricGrams, totalPhysicalGrams);

        // BOM Weight from Column S (already in grams)
        const bomWeightGrams = parseFloat(row[18]) || 0;

        // Status from Column T
        const status = row[19]?.toString().trim() || '';

        // For weight category, convert to kg temporarily
        const chargeableWeightKg = chargeableWeightGrams / 1000;

        const productData = {
            Product_Code: sku,
            Bill_Dimension_Weight: boxes,

            // All weights stored in GRAMS (will display as kg in UI)
            Billed_Physical_Weight: Math.round(totalPhysicalGrams),
            Billed_Volumetric_Weight: Math.round(totalVolumetricGrams),
            Billed_Chargeable_Weight: Math.round(chargeableWeightGrams),
            BOM_Weight: Math.round(bomWeightGrams),
            Total_Weight: Math.round(chargeableWeightGrams),

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

    // Show first 3 products as sample
    console.log('\nSample Products (first 3):');
    products.slice(0, 3).forEach((p, idx) => {
        console.log(`\n${idx + 1}. ${p.Product_Code}`);
        console.log(`   Boxes: ${p.Bill_Dimension_Weight.length}`);
        p.Bill_Dimension_Weight.forEach(box => {
            console.log(`     Box ${box.Box_Number}: ${box.Length}×${box.Width}×${box.Height} cm, ${(box.Weight / 1000).toFixed(3)} kg (${box.Weight}g stored)`);
        });
        console.log(`   Physical: ${(p.Billed_Physical_Weight / 1000).toFixed(3)} kg (${p.Billed_Physical_Weight}g stored)`);
        console.log(`   Volumetric: ${(p.Billed_Volumetric_Weight / 1000).toFixed(3)} kg`);
        console.log(`   Chargeable: ${(p.Billed_Chargeable_Weight / 1000).toFixed(3)} kg`);
        console.log(`   BOM: ${(p.BOM_Weight / 1000).toFixed(3)} kg`);
        console.log(`   Category: ${p.Weight_Category_Billed}`);
    });

    console.log('\n✅ Parsing complete! Next step: Sync to Zoho CRM');

} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
}
