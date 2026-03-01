
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
const PARENT_MODULE = 'Parent_MTP_SKU';

async function getHeaders() {
    return {
        'Authorization': `Zoho-oauthtoken ${process.env.ZOHO_ACCESS_TOKEN}`, // User will need to run refresh token script if expired, or I'll implement refresh logic here to be safe
        'Content-Type': 'application/json'
    };
}

// Simple Token Refresh Logic (copied from other scripts to ensure it runs)
async function refreshAccessToken() {
    try {
        const url = `${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/token?refresh_token=${process.env.ZOHO_REFRESH_TOKEN}&client_id=${process.env.ZOHO_CLIENT_ID}&client_secret=${process.env.ZOHO_CLIENT_SECRET}&grant_type=refresh_token`;
        const response = await axios.post(url);
        return response.data.access_token;
    } catch (error) {
        console.error("❌ Token Refresh Failed:", error.message);
        process.exit(1);
    }
}

async function fetchAllRecords(module) {
    let allRecords = [];
    let page = 1;
    let hasMore = true;
    const accessToken = await refreshAccessToken();
    const headers = { 'Authorization': `Zoho-oauthtoken ${accessToken}` };

    console.log(`🔍 Fetching ALL records from ${module}...`);

    while (hasMore) {
        try {
            const response = await axios.get(`${ZOHO_API_DOMAIN}/crm/v2/${module}?page=${page}&per_page=200`, { headers });
            const data = response.data.data;
            if (data && data.length > 0) {
                allRecords = allRecords.concat(data);
                process.stdout.write(`\rFetched: ${allRecords.length} records...`);
                page++;
            } else {
                hasMore = false;
            }
        } catch (error) {
            hasMore = false;
            // console.error(error.response?.data || error.message);
        }
    }
    console.log(`\n✅ Total Fetched: ${allRecords.length}`);
    return allRecords;
}

// Load Master Data
const unifiedData = JSON.parse(fs.readFileSync('./unified_master_data.json', 'utf8'));
const masterSKUs = new Set(unifiedData.map(u => u.sku));

console.log(`📦 Master Data Count: ${unifiedData.length}`);

async function analyze() {
    const records = await fetchAllRecords(PARENT_MODULE);

    const analysis = {
        totalCrm: records.length,
        totalMaster: unifiedData.length,
        validParams: 0,
        orphans: 0, // Not in master
        duplicates: 0,
        toDelete: []
    };

    const skuMap = new Map();

    records.forEach(record => {
        const sku = record.Name; // Assuming Name is the MTP SKU
        const id = record.id;

        if (!masterSKUs.has(sku)) {
            analysis.orphans++;
            analysis.toDelete.push({ id, sku, reason: 'Not in Master' });
        } else {
            if (skuMap.has(sku)) {
                analysis.duplicates++;
                // Keep the one with more fields populated or latest?
                // For now, mark this subsequent one for deletion
                analysis.toDelete.push({ id, sku, reason: 'Duplicate' });
            } else {
                skuMap.set(sku, id);
                analysis.validParams++;
            }
        }
    });

    console.log('\n📊 Analysis Results:');
    console.log(`Total in CRM: ${analysis.totalCrm}`);
    console.log(`Valid Matched: ${analysis.validParams}`);
    console.log(`Orphans (Unknown SKUs): ${analysis.orphans}`);
    console.log(`Duplicates Found: ${analysis.duplicates}`);
    console.log(`-----------------------------------`);
    console.log(`Recommended Deletion Count: ${analysis.toDelete.length}`);

    // Save delete list
    fs.writeFileSync('deletion_list.json', JSON.stringify(analysis.toDelete, null, 2));
    console.log(`💾 Saved ${analysis.toDelete.length} records to deletion_list.json`);
}

analyze();
