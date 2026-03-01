const axios = require('axios');
const fs = require('fs');
const XLSX = require('xlsx');
require('dotenv').config();

const CONFIG = {
    authDomain: 'https://accounts.zoho.com',
    apiDomain: 'https://www.zohoapis.com',
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
    excelFile: 'SKU Aliases, Parent & Child Master Data (1).xlsx'
};

if (!CONFIG.clientId || !CONFIG.clientSecret || !CONFIG.refreshToken) {
    console.error('❌ Missing ZOHO credentials in .env');
    process.exit(1);
}

async function getAccessToken() {
    try {
        const response = await axios.post(`${CONFIG.authDomain}/oauth/v2/token`, null, {
            params: {
                refresh_token: CONFIG.refreshToken,
                client_id: CONFIG.clientId,
                client_secret: CONFIG.clientSecret,
                grant_type: 'refresh_token'
            }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Token Refresh Failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

async function getParentByMTPName(mtpSku, token) {
    try {
        const response = await axios.get(`${CONFIG.apiDomain}/crm/v3/Parent_MTP_SKU/search?criteria=(Name:equals:${encodeURIComponent(mtpSku)})`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
        });

        if (response.data.data && response.data.data.length > 0) {
            return response.data.data[0];
        }
        return null;
    } catch (error) {
        return null;
    }
}

async function updateParentRecord(parentId, data, token) {
    try {
        const payload = {
            data: [{
                id: parentId,
                ...data
            }]
        };

        const response = await axios.put(`${CONFIG.apiDomain}/crm/v3/Parent_MTP_SKU/${parentId}`, payload, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
        });

        if (response.data.data && response.data.data[0].code === 'SUCCESS') {
            return true;
        } else {
            console.error(`      ❌ Update Failed:`, response.data.data[0]);
            return false;
        }
    } catch (error) {
        console.error(`      ❌ API Error: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function run() {
    console.log('🚀 Starting Parent MRP Population...');

    if (!fs.existsSync(CONFIG.excelFile)) {
        console.error(`❌ Excel file not found: ${CONFIG.excelFile}`);
        process.exit(1);
    }

    const token = await getAccessToken();
    console.log('🔑 Access Token Obtained');

    const workbook = XLSX.readFile(CONFIG.excelFile);
    const sheetName = 'MTP SKUs - Master Data';

    if (!workbook.SheetNames.includes(sheetName)) {
        console.error(`❌ Sheet "${sheetName}" not found!`);
        process.exit(1);
    }

    console.log(`📄 Using Sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`📊 Found ${data.length} rows in Excel`);

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const row of data) {
        const mtpSku = row['MTP SKU'];

        if (!mtpSku) continue;

        console.log(`\nProcessing Parent SKU: ${mtpSku}`);

        const parent = await getParentByMTPName(mtpSku, token);

        if (!parent) {
            console.log(`   ⚠️ Parent Record not found: ${mtpSku}`);
            failCount++;
            continue;
        }

        const updates = {};

        // Map Fields
        if (row['MRP'] !== undefined) updates.Unit_Price = parseFloat(row['MRP']).toFixed(2);
        if (row['CHP'] !== undefined) updates.Channel_Price = parseFloat(row['CHP']).toFixed(2);
        if (row['U.DP'] !== undefined) updates.Ususal_Price = parseFloat(row['U.DP']).toFixed(2);

        // Fixed Values
        updates.Installation = 'DIY';
        updates.Installation_Price = 500.00; // User Request

        // Ensure we actually have updates
        if (Object.keys(updates).length > 0) {
            console.log(`   📝 Updating: Unit=${updates.Unit_Price}, Channel=${updates.Channel_Price}, Usual=${updates.Ususal_Price}, Install=${updates.Installation}, Price=${updates.Installation_Price}`);

            const updated = await updateParentRecord(parent.id, updates, token);
            if (updated) {
                console.log('      ✅ Success');
                successCount++;
            } else {
                failCount++;
            }
        } else {
            console.log('   ⏭️  No data to update');
            skipCount++;
        }
    }

    console.log('\n--- Summary ---');
    console.log(`✅ Updated: ${successCount}`);
    console.log(`⏭️  Skipped: ${skipCount}`);
    console.log(`❌ Failed:  ${failCount}`);
}

run();
