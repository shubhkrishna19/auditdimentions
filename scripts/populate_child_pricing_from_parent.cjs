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
        return null;
    }
}

async function updateProduct(id, updates, token) {
    try {
        const payload = {
            data: [{
                id: id,
                ...updates
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
        if (error.response) {
            console.error(`      ❌ API Error Details:`, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(`      ❌ Network Error: ${error.message}`);
        }
        return false;
    }
}

async function run() {
    console.log('🚀 Starting Child Product Pricing Population...');

    if (!fs.existsSync(CONFIG.excelFile)) {
        console.error(`❌ Excel file not found: ${CONFIG.excelFile}`);
        process.exit(1);
    }

    const token = await getAccessToken();
    console.log('🔑 Access Token Obtained');

    const workbook = XLSX.readFile(CONFIG.excelFile);

    // 1. Read Parent Data (Prices)
    const parentSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('mtp') && s.toLowerCase().includes('master'));
    if (!parentSheetName) { console.error('Parent Sheet not found'); process.exit(1); }
    const parentData = XLSX.utils.sheet_to_json(workbook.Sheets[parentSheetName]);

    const parentMap = new Map();
    parentData.forEach(row => {
        const mtpSku = row['MTP SKU'];
        if (mtpSku) {
            parentMap.set(mtpSku, {
                mrp: row['MRP'],
                chp: row['CHP'],
                udp: row['U.DP']
            });
        }
    });
    console.log(`📦 Loaded ${parentMap.size} Parent Pricing Records.`);

    // 2. Read Child Data
    const childSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('child') && s.toLowerCase().includes('alias'));
    if (!childSheetName) { console.error('Child Sheet not found'); process.exit(1); }
    const childSheet = workbook.Sheets[childSheetName];
    const childData = XLSX.utils.sheet_to_json(childSheet); // Use first row as header by default

    // Debug headers if needed (skipped for now as we know 'Seller SKU')
    // Check if 'MTP SKU' column exists
    if (childData.length > 0 && !childData[0]['MTP SKU']) {
        console.log('⚠️  Warning: "MTP SKU" column might be missing or named differently.');
        console.log('Keys:', Object.keys(childData[0]));
    }

    console.log(`👶 Found ${childData.length} Child Rows.`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const row of childData) {
        // Find keys (Seller SKU and MTP SKU)
        const childSkuKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'seller sku' || k.trim().toLowerCase() === 'sku code');
        const parentSkuKey = Object.keys(row).find(k => k.trim() === 'MTP SKU');

        const childSku = row[childSkuKey];
        const parentSku = row[parentSkuKey];

        if (!childSku) continue;

        console.log(`Processing ${childSku} (Parent: ${parentSku})...`);

        if (!parentSku || !parentMap.has(parentSku)) {
            console.log(`   ⏭️ Parent Pricing NOT Found for ${parentSku}`);
            skipCount++;
            continue;
        }

        const prices = parentMap.get(parentSku);

        // Prepare Updates
        const updates = {};
        if (prices.mrp) updates.Unit_Price = parseFloat(prices.mrp);
        if (prices.chp) updates.Channel_Price = parseFloat(prices.chp);
        if (prices.udp) updates.Ususal_Price = parseFloat(prices.udp);

        updates.Installation_Mode = 'DIY';
        updates.Installation_Price = 500.00;
        updates.Tax = [{ id: CONFIG.taxId, value: CONFIG.taxValue }];

        // Search Product in CRM
        const product = await searchProductByCode(childSku, token);
        if (!product) {
            console.log(`   ⚠️ Child Product Not Found in CRM`);
            skipCount++;
            continue;
        }

        // Update
        const updated = await updateProduct(product.id, updates, token);
        if (updated) {
            console.log(`   ✅ Pricing Updated`);
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

run();
