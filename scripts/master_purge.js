
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
const PARENT_MODULE = 'Parent_MTP_SKU';

// Load Deletion List
const deleteList = JSON.parse(fs.readFileSync('./deletion_list.json', 'utf8'));

console.log(`🧹 Starting Purge of ${deleteList.length} duplicates...`);

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

async function bulkDelete(ids, accessToken) {
    const headers = { 'Authorization': `Zoho-oauthtoken ${accessToken}` };

    // Zoho allows max 100 per delete call
    // ids is comma separated string

    try {
        const response = await axios.delete(`${ZOHO_API_DOMAIN}/crm/v2/${PARENT_MODULE}?ids=${ids}`, { headers });
        // Response format: { data: [ { code: 'SUCCESS', details: { id: '...' } } ] }
        const successCount = response.data.data.filter(r => r.code === 'SUCCESS').length;
        return successCount;
    } catch (error) {
        // Detailed Error Logging
        console.error('❌ Delete Batch Error Details:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Message:', error.message);
        }
        return 0;
    }
}

async function runPurge() {
    if (deleteList.length === 0) {
        console.log('✅ No duplicates to delete.');
        return;
    }

    console.log('🔑 Generating Access Token...');
    const accessToken = await refreshAccessToken();
    console.log('✅ Token Generated. Starting Purge...');

    const idsToDelete = deleteList.map(item => item.id);
    const BATCH_SIZE = 50; // Safe batch size
    let deletedTotal = 0;

    for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
        const batch = idsToDelete.slice(i, i + BATCH_SIZE);
        const idString = batch.join(',');

        process.stdout.write(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(idsToDelete.length / BATCH_SIZE)}... `);

        const count = await bulkDelete(idString, accessToken);
        deletedTotal += count;

        console.log(`Deleted ${count} records.`);

        // Safety delay
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n🎉 Purge Complete! Total Deleted: ${deletedTotal}`);
}

runPurge();
