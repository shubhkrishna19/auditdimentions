import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MASTER_DATA_FILE = './unified_master_data.json';

async function getAccessToken() {
    const params = new URLSearchParams();
    params.append('refresh_token', process.env.ZOHO_REFRESH_TOKEN);
    params.append('client_id', process.env.ZOHO_CLIENT_ID);
    params.append('client_secret', process.env.ZOHO_CLIENT_SECRET);
    params.append('grant_type', 'refresh_token');

    const response = await axios.post(`${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`, params);
    return response.data.access_token;
}

async function fetchAllRecords(module, token) {
    let allRecords = [];
    let page = 1;
    let moreRecords = true;

    console.log(`📡 Fetching all records from ${module}...`);

    while (moreRecords) {
        process.stdout.write(`   Page ${page}... `);
        try {
            const response = await axios.get(`${process.env.ZOHO_API_DOMAIN}/crm/v2/${module}`, {
                headers: { Authorization: `Zoho-oauthtoken ${token}` },
                params: { page: page, per_page: 200 }
            });

            const data = response.data.data || [];
            allRecords = allRecords.concat(data);
            moreRecords = response.data.info.more_records;
            page++;
            console.log(`✅ (${data.length} records)`);
        } catch (error) {
            console.error('\n❌ Failed to fetch:', error.message);
            moreRecords = false;
        }
    }
    return allRecords;
}

async function runPurge(isDryRun = true) {
    try {
        if (!fs.existsSync(MASTER_DATA_FILE)) {
            console.error('❌ Master data file not found. Run generate_unified_master.js first.');
            return;
        }

        const masterData = JSON.parse(fs.readFileSync(MASTER_DATA_FILE, 'utf8'));
        const masterSkus = new Set(masterData.map(item => item.sku));

        const token = await getAccessToken();

        // Modules to check
        const modules = ['Parent_MTP_SKU', 'Products'];
        let totalToDelete = [];

        for (const module of modules) {
            const records = await fetchAllRecords(module, token);
            const skuMap = new Map();
            const skuField = module === 'Parent_MTP_SKU' ? 'Name' : 'Product_Code';

            records.forEach(rec => {
                const sku = rec[skuField];
                if (!skuMap.has(sku)) skuMap.set(sku, []);
                skuMap.get(sku).push(rec);
            });

            console.log(`\n🔍 Analyzing ${module}:`);
            let dupCount = 0;
            let orphanCount = 0;

            for (const [sku, recs] of skuMap.entries()) {
                // 1. Check for Orphans (Not in our master list)
                if (!masterSkus.has(sku)) {
                    orphanCount++;
                    recs.forEach(r => totalToDelete.push({ module, id: r.id, sku, reason: 'Orphan' }));
                    continue;
                }

                // 2. Check for Duplicates (More than one record for same SKU)
                if (recs.length > 1) {
                    dupCount++;
                    // Keep the oldest one (first in list usually, but let's be safe and skip the first item)
                    const toRemove = recs.slice(1);
                    toRemove.forEach(r => totalToDelete.push({ module, id: r.id, sku, reason: 'Duplicate' }));
                }
            }

            console.log(`   - Unique SKUs Found: ${skuMap.size}`);
            console.log(`   - Orphaned SKUs: ${orphanCount}`);
            console.log(`   - Duplicate SKU sets: ${dupCount}`);
        }

        console.log(`\n🚩 TOTAL RECORDS FLAGGED FOR DELETION: ${totalToDelete.length}`);

        if (isDryRun) {
            console.log('📝 DRY RUN COMPLETE. No records were deleted.');
            console.log('Run with --exec to perform deletion.');
        } else {
            console.log('⚠️  EXECUTING BULK DELETION...');
            // Batch delete (max 100 per request)
            for (let i = 0; i < totalToDelete.length; i += 100) {
                const batch = totalToDelete.slice(i, i + 100);
                // Note: v2 API delete is usually by ID or multiple IDs
                // For simplicity and safety in a rescue mission, we do them in batches
                for (const item of batch) {
                    try {
                        await axios.delete(`${process.env.ZOHO_API_DOMAIN}/crm/v2/${item.module}/${item.id}`, {
                            headers: { Authorization: `Zoho-oauthtoken ${token}` }
                        });
                        process.stdout.write('.');
                    } catch (e) {
                        process.stdout.write('F');
                    }
                }
                console.log(`\n✅ Deleted ${Math.min(i + 100, totalToDelete.length)}/${totalToDelete.length}`);
            }
            console.log('🏁 PURGE COMPLETED.');
        }

    } catch (error) {
        console.error('❌ Error during purge:', error.message);
    }
}

const isDry = process.argv.includes('--exec') ? false : true;
runPurge(isDry);
