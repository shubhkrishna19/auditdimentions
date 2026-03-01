/**
 * Sync All Products to Zoho CRM via Catalyst Bulk Processor
 * 
 * Usage:
 * 1. Update CATALYST_URL with your Catalyst project URL
 * 2. Run: node sync-to-zoho.js
 */

const XLSX = require('xlsx');
const axios = require('axios');
const path = require('path');

// ============ CONFIGURATION ============
const CONFIG = {
    // UPDATE THIS with your Catalyst project URL
    CATALYST_URL: 'https://zoho-data-integration-60xxxxx.catalyst.zoho.com',

    // Excel file path
    EXCEL_FILE: path.join(__dirname, 'DimensionsMasterLatest.xlsx'),

    // Sync settings
    CREATE_CHECKPOINTS: true,
    POLLING_INTERVAL: 5000, // 5 seconds
    MAX_POLL_TIME: 300000 // 5 minutes
};

// ============ FUNCTIONS ============

/**
 * Parse Excel and prepare product data
 */
function parseExcelData() {
    console.log('📖 Reading Excel file...');

    const workbook = XLSX.readFile(CONFIG.EXCEL_FILE);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON (skip header rows)
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: ''
    });

    console.log(`Found ${rawData.length} rows in Excel`);

    // Parse products (adjust column indices based on your Excel structure)
    const products = [];

    // Start from row 4 (skip headers)
    for (let i = 4; i < rawData.length; i++) {
        const row = rawData[i];

        // Skip empty rows
        if (!row[0]) continue;

        const sku = row[0]; // Column A: SKU/Product Code

        // Extract box dimensions and weights
        const box1 = {
            length: parseFloat(row[2]) || 0,
            width: parseFloat(row[3]) || 0,
            height: parseFloat(row[4]) || 0,
            weight: parseFloat(row[5]) || 0 // Already in grams
        };

        const box2 = {
            length: parseFloat(row[6]) || 0,
            width: parseFloat(row[7]) || 0,
            height: parseFloat(row[8]) || 0,
            weight: parseFloat(row[9]) || 0
        };

        const box3 = {
            length: parseFloat(row[10]) || 0,
            width: parseFloat(row[11]) || 0,
            height: parseFloat(row[12]) || 0,
            weight: parseFloat(row[13]) || 0
        };

        // Calculate total physical weight (sum of all boxes)
        const totalPhysicalWeight = box1.weight + box2.weight + box3.weight;

        // Calculate volumetric weight (using divisor 5 for grams)
        const box1Vol = (box1.length * box1.width * box1.height) / 5;
        const box2Vol = (box2.length * box2.width * box2.height) / 5;
        const box3Vol = (box3.length * box3.width * box3.height) / 5;
        const totalVolumetricWeight = box1Vol + box2Vol + box3Vol;

        // Chargeable weight (max of physical and volumetric)
        const chargeableWeight = Math.max(totalPhysicalWeight, totalVolumetricWeight);

        // Determine weight category
        const chargeableKg = chargeableWeight / 1000;
        let category = '10kg';
        if (chargeableKg <= 0.5) category = '500gm';
        else if (chargeableKg <= 1) category = '1kg';
        else if (chargeableKg <= 2) category = '2kg';
        else if (chargeableKg <= 5) category = '5kg';

        const product = {
            Product_Code: sku,
            Billed_Physical_Weight: Math.round(totalPhysicalWeight),
            Billed_Volumetric_Weight: Math.round(totalVolumetricWeight),
            Billed_Chargeable_Weight: Math.round(chargeableWeight),
            BOM_Weight: Math.round(totalPhysicalWeight), // Same as physical for now
            Weight_Category_Billed: category,
            Total_Weight: Math.round(chargeableWeight)
        };

        products.push(product);
    }

    console.log(`✅ Parsed ${products.length} products`);
    console.log('\nSample product:', products[0]);

    return products;
}

/**
 * Send products to Catalyst for bulk sync
 */
async function syncToZoho(products) {
    console.log(`\n🚀 Syncing ${products.length} products to Zoho...`);

    try {
        const response = await axios.post(
            `${CONFIG.CATALYST_URL}/server/bulk-sync-products`,
            {
                products: products,
                createCheckpoints: CONFIG.CREATE_CHECKPOINTS
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.success) {
            console.log('✅ Bulk sync job started successfully!');
            console.log(`Job ID: ${response.data.jobId}`);
            console.log(`Checkpoint ID: ${response.data.checkpointId || 'N/A'}`);
            console.log(`Record Count: ${response.data.recordCount}`);
            return response.data;
        } else {
            throw new Error('Sync request failed');
        }
    } catch (error) {
        console.error('❌ Sync error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Poll job status until complete
 */
async function pollJobStatus(jobId) {
    console.log('\n⏳ Monitoring job status...');

    const startTime = Date.now();
    let lastStatus = '';

    while (true) {
        // Check if exceeded max poll time
        if (Date.now() - startTime > CONFIG.MAX_POLL_TIME) {
            console.log('⚠️ Max polling time exceeded. Job may still be running.');
            break;
        }

        try {
            const response = await axios.get(
                `${CONFIG.CATALYST_URL}/server/check-job-status?jobId=${jobId}`
            );

            const status = response.data.status;
            const processed = response.data.processed || 0;
            const total = response.data.totalRecords || 0;
            const failed = response.data.failed || 0;

            // Only log if status changed
            if (status !== lastStatus) {
                console.log(`Status: ${status} | Processed: ${processed}/${total} | Failed: ${failed}`);
                lastStatus = status;
            }

            if (status === 'COMPLETED') {
                console.log('\n🎉 Sync completed successfully!');
                console.log(`✅ Successful: ${processed - failed}/${total}`);
                if (failed > 0) {
                    console.log(`❌ Failed: ${failed}`);
                    console.log(`Download error report: ${response.data.downloadUrl}`);
                }
                return response.data;
            }

            if (status === 'FAILED') {
                console.error('\n❌ Sync job failed!');
                throw new Error('Bulk write job failed');
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, CONFIG.POLLING_INTERVAL));

        } catch (error) {
            console.error('Error polling status:', error.message);
            break;
        }
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('═══════════════════════════════════════');
    console.log('  ZOHO CRM BULK DATA SYNC');
    console.log('═══════════════════════════════════════\n');

    try {
        // Step 1: Parse Excel
        const products = parseExcelData();

        if (products.length === 0) {
            console.error('❌ No products found in Excel file!');
            return;
        }

        // Step 2: Confirm sync
        console.log(`\n⚠️  About to sync ${products.length} products to Zoho CRM`);
        console.log('   This will UPDATE existing products based on Product_Code');

        if (CONFIG.CREATE_CHECKPOINTS) {
            console.log('   ✅ Checkpoints ENABLED - You can restore if needed');
        } else {
            console.log('   ⚠️  Checkpoints DISABLED - No rollback capability!');
        }

        // Give user 5 seconds to cancel
        console.log('\n   Press Ctrl+C to cancel...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Step 3: Sync to Zoho
        const syncResult = await syncToZoho(products);

        // Step 4: Poll status
        await pollJobStatus(syncResult.jobId);

        console.log('\n═══════════════════════════════════════');
        console.log('  SYNC COMPLETE!');
        console.log('═══════════════════════════════════════');
        console.log('\nNext steps:');
        console.log('1. Verify data in Zoho CRM');
        console.log('2. Check product cards for updated weights');
        console.log('3. If issues, use restore function with checkpoint ID:', syncResult.checkpointId);

    } catch (error) {
        console.error('\n❌ Sync failed:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Check CATALYST_URL is correct');
        console.error('2. Ensure Catalyst functions are deployed');
        console.error('3. Verify Zoho access token is valid');
        console.error('4. Check Excel file path and format');
        process.exit(1);
    }
}

// Run
main();
