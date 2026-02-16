/**
 * Zoho CRM Sync Script
 * Syncs parsed billing dimensions to Zoho CRM Products & Parent_MTP_SKU modules
 */

import fs from 'fs';

// Configuration
const PARSED_DATA_FILE = './parsed_billing_dimensions.json';
const BATCH_SIZE = 10; // Process in batches to avoid rate limits
const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay

// Load parsed data
console.log('[ZohoSync] Loading parsed data...');
const products = JSON.parse(fs.readFileSync(PARSED_DATA_FILE, 'utf-8'));
console.log(`[ZohoSync] Loaded ${products.length} products to sync`);

// Results tracking
const results = {
    total: products.length,
    updated: 0,
    created: 0,
    errors: [],
    startTime: new Date(),
    endTime: null
};

// Simulate Zoho API (will be replaced with actual ZOHO.CRM.API calls in widget)
const ZohoAPI = {
    async searchRecord(module, sku) {
        // Simulated search
        console.log(`  [API] Searching ${module} for SKU: ${sku}...`);
        // In real implementation:
        // return await ZOHO.CRM.API.searchRecord({
        //     Entity: module,
        //     Type: "criteria",
        //     Query: `(Product_Code:equals:${sku})`
        // });

        // For now, simulate "not found" for demo
        return { data: [] };
    },

    async updateRecord(module, data) {
        console.log(`  [API] Updating ${module} record ${data.id}...`);
        // In real implementation:
        // return await ZOHO.CRM.API.updateRecord({
        //     Entity: module,
        //     APIData: data
        // });
        return { data: [{ code: 'SUCCESS' }] };
    },

    async insertRecord(module, data) {
        console.log(`  [API] Creating ${module} record for ${data.Product_Code}...`);
        // In real implementation:
        // return await ZOHO.CRM.API.insertRecord({
        //     Entity: module,
        //     APIData: data
        // });
        return { data: [{ code: 'SUCCESS', details: { id: 'NEW_' + Date.now() } }] };
    }
};

// Helper: Delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main sync function
async function syncProduct(productData) {
    try {
        const sku = productData.Product_Code;

        // Determine module (Parent_MTP_SKU or Products)
        // For now, assume all are Parent_MTP_SKU since we're focusing on parents
        const module = 'Parent_MTP_SKU';

        // Search for existing record
        const searchResult = await ZohoAPI.searchRecord(module, sku);

        if (searchResult.data && searchResult.data.length > 0) {
            // UPDATE existing
            const existingRecord = searchResult.data[0];
            const updateData = {
                id: existingRecord.id,
                ...productData
            };

            const updateResult = await ZohoAPI.updateRecord(module, updateData);

            if (updateResult.data && updateResult.data[0].code === 'SUCCESS') {
                results.updated++;
                return { success: true, action: 'updated', sku };
            } else {
                throw new Error('Update failed: ' + JSON.stringify(updateResult));
            }
        } else {
            // CREATE new
            const insertResult = await ZohoAPI.insertRecord(module, productData);

            if (insertResult.data && insertResult.data[0].code === 'SUCCESS') {
                results.created++;
                return { success: true, action: 'created', sku };
            } else {
                throw new Error('Insert failed: ' + JSON.stringify(insertResult));
            }
        }
    } catch (error) {
        results.errors.push({
            sku: productData.Product_Code,
            error: error.message
        });
        return { success: false, sku: productData.Product_Code, error: error.message };
    }
}

// Batch processing function
async function syncBatch(batch, batchNumber, totalBatches) {
    console.log(`\n[ZohoSync] Processing Batch ${batchNumber}/${totalBatches} (${batch.length} products)...`);

    const batchResults = [];

    for (const product of batch) {
        const result = await syncProduct(product);
        batchResults.push(result);

        // Show progress
        const status = result.success ? '✅' : '❌';
        console.log(`  ${status} ${result.sku} (${result.action || 'failed'})`);
    }

    return batchResults;
}

// Main execution
async function runSync() {
    console.log('\n' + '='.repeat(80));
    console.log('ZOHO CRM SYNC - STARTING');
    console.log('='.repeat(80));
    console.log(`Total Products: ${products.length}`);
    console.log(`Batch Size: ${BATCH_SIZE}`);
    console.log(`Estimated Batches: ${Math.ceil(products.length / BATCH_SIZE)}`);
    console.log('='.repeat(80));

    // Split into batches
    const batches = [];
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
        batches.push(products.slice(i, i + BATCH_SIZE));
    }

    const totalBatches = batches.length;

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
        await syncBatch(batches[i], i + 1, totalBatches);

        // Delay between batches (except last one)
        if (i < batches.length - 1) {
            console.log(`  [ZohoSync] Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
            await delay(DELAY_BETWEEN_BATCHES);
        }
    }

    results.endTime = new Date();

    // Generate final report
    generateReport();
}

// Report generation
function generateReport() {
    const duration = ((results.endTime - results.startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('SYNC COMPLETE - FINAL REPORT');
    console.log('='.repeat(80));
    console.log(`Total Products: ${results.total}`);
    console.log(`✅ Updated: ${results.updated}`);
    console.log(`➕ Created: ${results.created}`);
    console.log(`❌ Errors: ${results.errors.length}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('='.repeat(80));

    if (results.errors.length > 0) {
        console.log('\nERRORS:');
        results.errors.forEach((err, idx) => {
            console.log(`  ${idx + 1}. ${err.sku}: ${err.error}`);
        });
    }

    // Save report to file
    const reportPath = './sync_report.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    console.log('\n✅ SYNC PROCESS COMPLETE!');
}

// Run the sync
runSync().catch(error => {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
});
