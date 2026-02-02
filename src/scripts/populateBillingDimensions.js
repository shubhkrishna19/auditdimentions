/**
 * Zoho CRM Bulk Population Script
 * Reads Billing Dimensions Excel and populates Products module
 */

import * as XLSX from 'xlsx';
import ZohoAPI from '../services/ZohoAPI.js';

const VOLUMETRIC_DIVISOR = 5000;

async function populateBillingDimensions(filePath) {
    console.log('[BulkPopulate] Reading Excel file...');

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Billing Dimensions'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Skip first 3 rows (headers/units), start from row 4 (index 3)
    const dataRows = data.slice(3);

    console.log(`[BulkPopulate] Found ${dataRows.length} products to populate`);

    const zoho = new ZohoAPI();
    await zoho.init();

    const results = [];

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];

        // Column A: SKU Code
        const skuCode = row[0]?.toString().trim();
        if (!skuCode) continue;

        // Column B: SB/MB indicator
        const boxType = row[1]?.toString().trim();

        // Parse boxes
        const boxes = [];

        // Box 1 (C-F: L, W, H, Weight in grams)
        if (row[2]) {
            boxes.push({
                boxNumber: 1,
                length: parseFloat(row[2]) || 0,
                width: parseFloat(row[3]) || 0,
                height: parseFloat(row[4]) || 0,
                weight: (parseFloat(row[5]) || 0) / 1000 // grams to kg
            });
        }

        // Box 2 (G-J)
        if (row[6]) {
            boxes.push({
                boxNumber: 2,
                length: parseFloat(row[6]) || 0,
                width: parseFloat(row[7]) || 0,
                height: parseFloat(row[8]) || 0,
                weight: (parseFloat(row[9]) || 0) / 1000
            });
        }

        // Box 3 (K-N)
        if (row[10]) {
            boxes.push({
                boxNumber: 3,
                length: parseFloat(row[10]) || 0,
                width: parseFloat(row[11]) || 0,
                height: parseFloat(row[12]) || 0,
                weight: (parseFloat(row[13]) || 0) / 1000
            });
        }

        // Calculate weights
        let totalVolumetricWeight = 0;
        let totalPhysicalWeight = 0;

        boxes.forEach(box => {
            // Volumetric: (L*W*H) / 5000
            const volWeight = (box.length * box.width * box.height) / VOLUMETRIC_DIVISOR;
            totalVolumetricWeight += volWeight;
            totalPhysicalWeight += box.weight;
        });

        // Chargeable = Max(Volumetric, Physical)
        const chargeableWeight = Math.max(totalVolumetricWeight, totalPhysicalWeight);

        // Column Q: Physical Weight in Grams (verify against our calc)
        const excelPhysicalGrams = parseFloat(row[16]) || 0;
        const excelPhysicalKg = excelPhysicalGrams / 1000;

        // Column R: Total Weight in Kgs (likely chargeable or total)
        const excelTotalKg = parseFloat(row[17]) || 0;

        console.log(`[${i + 1}/${dataRows.length}] ${skuCode}: Vol=${totalVolumetricWeight.toFixed(2)}kg, Phys=${totalPhysicalWeight.toFixed(2)}kg, Chargeable=${chargeableWeight.toFixed(2)}kg`);

        // Prepare Zoho record
        const productData = {
            Product_Code: skuCode,
            Box_Type: boxType,
            Bill_Dimension_Weight: boxes.map(box => ({
                Box_Number: box.boxNumber,
                Box_Measurement: 'cm',
                Length: box.length,
                Width: box.width,
                Height: box.height,
                Weight_Measurement: 'kg',
                Weight: box.weight
            })),
            Total_Weight: chargeableWeight,
            Volumetric_Weight: totalVolumetricWeight,
            Physical_Weight: totalPhysicalWeight,
            Chargeable_Weight: chargeableWeight
        };

        results.push({ skuCode, productData });
    }

    console.log('[BulkPopulate] Summary:');
    console.log(`  Total products: ${results.length}`);
    console.log('  Ready to upload to Zoho CRM');

    return results;
}

// If running as script
if (import.meta.url === `file://${process.argv[1]}`) {
    const filePath = process.argv[2] || './DimensionsMasterLatest.xlsx';
    populateBillingDimensions(filePath)
        .then(results => {
            console.log('\n✅ Parse complete. Run updateZoho() to push to CRM.');
        })
        .catch(err => {
            console.error('❌ Error:', err);
        });
}

export { populateBillingDimensions };
