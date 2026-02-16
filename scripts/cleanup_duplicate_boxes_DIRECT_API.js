/**
 * Cleanup Duplicate Boxes - FIXED DIRECT API VERSION
 * Uses proper Zoho CRM v3 API format
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const CONFIG = {
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
    apiDomain: 'https://www.zohoapis.com'
};

let accessToken = null;

async function getAccessToken() {
    if (accessToken) return accessToken;
    console.log('🔑 Getting Access Token...');

    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
        params: {
            refresh_token: CONFIG.refreshToken,
            client_id: CONFIG.clientId,
            client_secret: CONFIG.clientSecret,
            grant_type: 'refresh_token'
        }
    });

    accessToken = response.data.access_token;
    console.log('✅ Token obtained\n');
    return accessToken;
}

async function getRecord(module, recordId) {
    const token = await getAccessToken();

    const response = await axios.get(`${CONFIG.apiDomain}/crm/v3/${module}/${recordId}`, {
        headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
    });

    return response.data?.data?.[0];
}

async function getAllRecordIds(module) {
    const token = await getAccessToken();
    let allIds = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const response = await axios.get(`${CONFIG.apiDomain}/crm/v3/${module}`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
            params: {
                fields: 'id',
                page: page,
                per_page: 200
            }
        });

        const records = response.data?.data || [];
        allIds = allIds.concat(records.map(r => r.id));

        if (response.data?.info?.more_records) {
            page++;
            await new Promise(r => setTimeout(r, 200));
        } else {
            hasMore = false;
        }
    }

    return allIds;
}

async function updateRecord(module, recordId, payload) {
    const token = await getAccessToken();

    const response = await axios.put(`${CONFIG.apiDomain}/crm/v3/${module}/${recordId}`, {
        data: [payload]
    }, {
        headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json'
        }
    });

    const result = response.data?.data?.[0];
    return result?.code === 'SUCCESS';
}

function deduplicateBoxes(boxes) {
    if (!boxes || boxes.length === 0) return [];

    const seen = new Map();
    const unique = [];

    for (const box of boxes) {
        const key = `${box.Box || box.BL}-${box.Length}-${box.Width}-${box.Height}-${box.Weight}`;
        if (!seen.has(key)) {
            seen.set(key, box);
            unique.push(box);
        }
    }

    return unique;
}

async function cleanupDuplicates() {
    console.log('🧹 Starting Duplicate Box Cleanup (DIRECT API - FIXED)...\n');

    let parentsCleaned = 0;
    let childrenCleaned = 0;
    let totalBoxesRemoved = 0;

    try {
        // Clean Parents
        console.log('📦 Fetching Parent_MTP_SKU IDs...');
        const parentIds = await getAllRecordIds('Parent_MTP_SKU');
        console.log(`   Found ${parentIds.length} parents\n`);

        console.log('🔍 Checking for duplicates...');
        for (const id of parentIds) {
            const parent = await getRecord('Parent_MTP_SKU', id);
            if (!parent) continue;

            const originalBoxes = parent.MTP_Box_Dimensions || [];
            if (originalBoxes.length === 0) continue;

            const uniqueBoxes = deduplicateBoxes(originalBoxes);

            if (originalBoxes.length !== uniqueBoxes.length) {
                const removed = originalBoxes.length - uniqueBoxes.length;
                console.log(`   ${parent.Name}: ${originalBoxes.length} → ${uniqueBoxes.length} boxes (removed ${removed})`);

                try {
                    await updateRecord('Parent_MTP_SKU', id, {
                        MTP_Box_Dimensions: uniqueBoxes
                    });
                    parentsCleaned++;
                    totalBoxesRemoved += removed;
                } catch (error) {
                    console.error(`   ❌ Failed: ${error.message}`);
                }

                await new Promise(r => setTimeout(r, 300));
            }
        }

        console.log(`\n✅ Parents cleaned: ${parentsCleaned}`);
        console.log(`   Duplicate boxes removed: ${totalBoxesRemoved}\n`);

        // Clean Children
        console.log('📦 Fetching Products IDs...');
        const childIds = await getAllRecordIds('Products');
        console.log(`   Found ${childIds.length} children\n`);

        let childBoxesRemoved = 0;
        console.log('🔍 Checking for duplicates...');

        for (const id of childIds) {
            const child = await getRecord('Products', id);
            if (!child) continue;

            const originalBoxes = child.Bill_Dimension_Weight || [];
            if (originalBoxes.length === 0) continue;

            const uniqueBoxes = deduplicateBoxes(originalBoxes);

            if (originalBoxes.length !== uniqueBoxes.length) {
                const removed = originalBoxes.length - uniqueBoxes.length;
                console.log(`   ${child.Product_Code}: ${originalBoxes.length} → ${uniqueBoxes.length} boxes (removed ${removed})`);

                try {
                    await updateRecord('Products', id, {
                        Bill_Dimension_Weight: uniqueBoxes
                    });
                    childrenCleaned++;
                    childBoxesRemoved += removed;
                } catch (error) {
                    console.error(`   ❌ Failed: ${error.message}`);
                }

                await new Promise(r => setTimeout(r, 300));
            }
        }

        console.log(`\n✅ Children cleaned: ${childrenCleaned}`);
        console.log(`   Duplicate boxes removed: ${childBoxesRemoved}\n`);

        // Summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 CLEANUP SUMMARY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ Total products cleaned: ${parentsCleaned + childrenCleaned}`);
        console.log(`   - Parents: ${parentsCleaned}`);
        console.log(`   - Children: ${childrenCleaned}`);
        console.log(`\n📦 Total duplicate boxes removed: ${totalBoxesRemoved + childBoxesRemoved}`);
        console.log(`   - From parents: ${totalBoxesRemoved}`);
        console.log(`   - From children: ${childBoxesRemoved}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('\n❌ Error:', error.response?.data || error.message);
        throw error;
    }
}

cleanupDuplicates()
    .then(() => {
        console.log('✅ Cleanup complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    });
