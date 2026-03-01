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

// Map Excel Headers to Picklist Values in Zoho
const PLATFORM_MAP = {
    'FNSKU': 'Amazon FNSKU',
    'ASIN': 'Amazon ASIN',
    'FK FSN': 'Flipkart FSN',
    'FK List.ID': 'Flipkart list ID',
    'UL': 'Urban Ladder',
    'PF ': 'Pepperfry', // Note: Header has trailing space
    'Myntra': 'Myntra'
};

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

async function getProductWithSubform(sku, token) {
    try {
        const response = await axios.get(`${CONFIG.apiDomain}/crm/v3/Products/search?criteria=(Product_Code:equals:${encodeURIComponent(sku)})`, {
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

async function updateProductSubform(productId, identifiers, token) {
    try {
        const payload = {
            data: [{
                id: productId,
                Product_Identifiers: identifiers
            }]
        };

        const response = await axios.put(`${CONFIG.apiDomain}/crm/v3/Products/${productId}`, payload, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
        });

        if (response.data.data && response.data.data[0].code === 'SUCCESS') {
            console.log(`      ✅ Updated Product with ${identifiers.length} identifiers`);
            return true;
        } else {
            console.error(`      ❌ Failed Update:`, response.data.data[0]);
            return false;
        }
    } catch (error) {
        console.error(`      ❌ API Error: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function run() {
    console.log('🚀 Starting Product Identifier Population (Subform Update Mode)...');

    if (!fs.existsSync(CONFIG.excelFile)) {
        console.error(`❌ Excel file not found: ${CONFIG.excelFile}`);
        process.exit(1);
    }

    const token = await getAccessToken();
    console.log('🔑 Access Token Obtained');

    const workbook = XLSX.readFile(CONFIG.excelFile);
    const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('child') && s.toLowerCase().includes('alias'));

    if (!sheetName) {
        console.error('❌ Sheet "Child SKUs - Alias Master" not found!');
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
        const sku = row['SKU Code'];
        if (!sku) continue;
        if (String(sku).includes('SKU Code')) continue; // Skip header row duplicates

        console.log(`\nProcessing SKU: ${sku}`);

        const product = await getProductWithSubform(sku, token);

        if (!product) {
            console.log(`   ⚠️ Product not found: ${sku}`);
            failCount++;
            continue;
        }

        const productId = product.id;

        // Existing Subform Data
        let existingIdentifiers = product.Product_Identifiers || [];
        // Map existing to check duplicates: "Platform|Identifier"
        const existingSet = new Set(existingIdentifiers.map(r => `${r.Platforms}|${r.Identifiers}`));

        const newIdentifiers = [];
        let changed = false;

        // Iterate through Platforms in Excel
        for (const [header, platformValue] of Object.entries(PLATFORM_MAP)) {
            const identifierVal = row[header];

            if (identifierVal && identifierVal !== 'N/A' && identifierVal !== '' && identifierVal !== undefined) {
                const key = `${platformValue}|${identifierVal}`;

                if (!existingSet.has(key)) {
                    // New Entry
                    newIdentifiers.push({
                        Platforms: platformValue,
                        Identifiers: String(identifierVal)
                    });
                    existingSet.add(key); // Add to set to prevent dupes within same row
                    changed = true;
                    console.log(`      ➕ Adding: ${platformValue} -> ${identifierVal}`);
                }
            }
        }

        if (changed) {
            // Combine existing (preserved) and new
            // Note: For Subforms, if we identify rows by ID, we update. Here we just append new objects.
            // Existing objects should be passed back with IDs to preserve them? 
            // Or if we pass full list without IDs, it creates new rows?
            // Zoho Subform behavior: To ADD, pass ALL existing + new. If existing have IDs, they update.
            // My 'existingIdentifiers' array comes from API, so it has IDs. Perfect.

            const finalSubformList = [...existingIdentifiers, ...newIdentifiers];

            const updated = await updateProductSubform(productId, finalSubformList, token);
            if (updated) successCount++;
            else failCount++;
        } else {
            console.log('      ⏭️  No changes needed');
            skipCount++;
        }
    }

    console.log('\n--- Summary ---');
    console.log(`✅ Updated: ${successCount}`);
    console.log(`⏭️  Skipped: ${skipCount}`);
    console.log(`❌ Failed:  ${failCount}`);
}

run();
