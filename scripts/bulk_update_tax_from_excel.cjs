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
    excelFile: 'SKU Aliases, Parent & Child Master Data (1).xlsx',
    taxId: '4301492000068517796',
    taxValue: 'GST18 - 18.0 %'
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

async function searchProductByCode(code, token) {
    try {
        const response = await axios.get(`${CONFIG.apiDomain}/crm/v3/Products/search?criteria=(Product_Code:equals:${encodeURIComponent(code)})`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
        });
        if (response.data.data && response.data.data.length > 0) {
            return response.data.data[0];
        }
        return null;
    } catch (error) {
        return null; // Ignore search errors (e.g. not found)
    }
}

async function updateProductTax(id, token) {
    try {
        const payload = {
            data: [{
                id: id,
                Tax: [{ id: CONFIG.taxId, value: CONFIG.taxValue }]
            }]
        };

        const response = await axios.put(`${CONFIG.apiDomain}/crm/v3/Products/${id}`, payload, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
        });

        if (response.data.data && response.data.data[0].code === 'SUCCESS') {
            return true;
        } else {
            console.error(`      ❌ API Error:`, response.data.data[0]);
            return false;
        }
    } catch (error) {
        console.error(`      ❌ Network Error: ${error.message}`);
        return false;
    }
}

async function run() {
    console.log('🚀 Starting Bulk Tax Update (GST18)...');

    if (!fs.existsSync(CONFIG.excelFile)) {
        console.error(`❌ Excel file not found: ${CONFIG.excelFile}`);
        process.exit(1);
    }

    const token = await getAccessToken();
    console.log('🔑 Access Token Obtained');

    const workbook = XLSX.readFile(CONFIG.excelFile);
    // Find Sheet Name (Case insensitive check)
    const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('child') && s.toLowerCase().includes('alias'));

    if (!sheetName) {
        console.error('❌ Child SKUs sheet not found.');
        process.exit(1);
    }

    console.log(`📄 Using Sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`📊 Found ${data.length} rows to process.`);

    if (data.length > 0) {
        console.log('Row 0 Keys:', Object.keys(data[0]));
    }

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const row of data) {
        // Try to find key like "Seller SKU" or "SKU Code"
        const skuKey = Object.keys(row).find(k => {
            const clean = k.trim().toLowerCase();
            return clean === 'seller sku' || clean === 'sku code';
        });

        const skuCode = row[skuKey];

        if (!skuCode) {
            // console.log('Skipping empty row or missing SKU');
            continue;
        }

        console.log(`Processing SKU: ${skuCode}`);

        const product = await searchProductByCode(skuCode, token);

        if (!product) {
            console.log(`   ⚠️ Not found in CRM`);
            skipCount++;
            continue;
        }

        // Check if Stock needs update
        const currentStock = product.Qty_in_Stock;
        if (currentStock >= 100) {
            console.log(`   ⏭️ Stock already >= 100 (${currentStock})`);
            skipCount++;
            continue;
        }

        const updated = await updateProductStock(product.id, token);
        if (updated) {
            console.log(`   ✅ Stock Updated to 100`);
            successCount++;
        } else {
            failCount++;
        }
    }

    console.log('\n--- Summary ---');
    console.log(`✅ Updated: ${successCount}`);
    console.log(`⏭️  Skipped: ${skipCount}`);
    console.log(`❌ Failed:  ${failCount}`);
}

async function updateProductStock(id, token) {
    try {
        const payload = {
            data: [{
                id: id,
                Qty_in_Stock: 100
            }]
        };

        const response = await axios.put(`${CONFIG.apiDomain}/crm/v3/Products/${id}`, payload, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
        });

        if (response.data.data && response.data.data[0].code === 'SUCCESS') {
            return true;
        } else {
            console.error(`      ❌ API Error:`, response.data.data[0]);
            return false;
        }
    } catch (error) {
        console.error(`      ❌ Network Error: ${error.message}`);
        return false;
    }
}
run();
