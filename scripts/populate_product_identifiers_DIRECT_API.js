/**
 * Populate Product Identifiers from Excel - DIRECT API VERSION
 * Reads platform identifiers from Excel and populates Product_Identifiers subform
 */

import axios from 'axios';
import XLSX from 'xlsx';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const CONFIG = {
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
    apiDomain: 'https://www.zohoapis.com'
};

const EXCEL_PATH = './scripts/SKU Aliases, Parent & Child Master Data LATEST .xlsx';

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

async function getAllProducts() {
    const token = await getAccessToken();
    let allProducts = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const response = await axios.get(`${CONFIG.apiDomain}/crm/v3/Products`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
            params: {
                fields: 'id,Product_Code,Product_Identifiers',
                page: page,
                per_page: 200
            }
        });

        const products = response.data?.data || [];
        allProducts = allProducts.concat(products);

        if (response.data?.info?.more_records) {
            page++;
            await new Promise(r => setTimeout(r, 200));
        } else {
            hasMore = false;
        }
    }

    return allProducts;
}

async function updateProduct(productId, identifiers) {
    const token = await getAccessToken();

    const response = await axios.put(`${CONFIG.apiDomain}/crm/v3/Products/${productId}`, {
        data: [{
            Product_Identifiers: identifiers
        }]
    }, {
        headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json'
        }
    });

    const result = response.data?.data?.[0];
    return result?.code === 'SUCCESS';
}

function parseExcelIdentifiers() {
    console.log(`📖 Reading Excel: ${EXCEL_PATH}`);

    if (!fs.existsSync(EXCEL_PATH)) {
        throw new Error(`Excel file not found: ${EXCEL_PATH}`);
    }

    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetNames = workbook.SheetNames;
    console.log(`   Found sheets: ${sheetNames.join(', ')}`);

    // Try to find the right sheet
    let sheetName = sheetNames.find(s =>
        s.toLowerCase().includes('child') ||
        s.toLowerCase().includes('sku') ||
        s.toLowerCase().includes('alias')
    );

    if (!sheetName) {
        sheetName = sheetNames[0];
        console.log(`   ⚠️ Using first sheet: ${sheetName}`);
    } else {
        console.log(`   Using sheet: ${sheetName}`);
    }

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`   Found ${data.length} rows\n`);

    const identifiersMap = new Map();

    for (const row of data) {
        // SKU column - EXACT match to Excel column name
        const sku = row['Seller SKU'];

        if (!sku || !sku.toString().trim()) continue;


        const identifiers = [];

        // Platform mappings - UPDATED to match actual Excel columns
        const platformMappings = [
            { channel: 'Amazon ASIN', keys: ['ASIN', 'Amazon ASIN', 'Amazon'] },
            { channel: 'Flipkart FSN', keys: ['FK FSN', 'Flipkart FSN', 'FSN'] },
            { channel: 'Urban Ladder', keys: ['UL', 'Urban Ladder', 'Urban Ladder ID'] },
            { channel: 'Pepperfry', keys: ['PF', 'PF ', 'Pepperfry', 'Pepperfry ID'] },
            { channel: 'Myntra', keys: ['Myntra', 'Myntra ID'] }
        ];

        for (const { channel, keys } of platformMappings) {
            for (const key of keys) {
                if (row[key] && row[key].toString().trim()) {
                    identifiers.push({
                        Channel: channel,
                        Identifier: row[key].toString().trim()
                    });
                    break;
                }
            }
        }

        if (identifiers.length > 0) {
            identifiersMap.set(sku, identifiers);
        }
    }

    console.log(`📊 Parsed ${identifiersMap.size} products with identifiers\n`);
    return identifiersMap;
}

async function populateIdentifiers() {
    console.log('🚀 Starting Product Identifiers Population (DIRECT API)...\n');

    try {
        // Parse Excel
        const identifiersMap = parseExcelIdentifiers();

        // Fetch all products
        console.log('📦 Fetching Products from CRM...');
        const products = await getAllProducts();
        console.log(`   Found ${products.length} products\n`);

        let updated = 0;
        let skipped = 0;
        let notFound = 0;
        let totalIdentifiersAdded = 0;

        console.log('🔍 Populating identifiers...');

        for (const product of products) {
            const sku = product.Product_Code;
            const identifiers = identifiersMap.get(sku);

            if (!identifiers) {
                notFound++;
                continue;
            }

            // Check if already has identifiers
            const existing = product.Product_Identifiers || [];
            if (existing.length > 0) {
                console.log(`   ⏭️  ${sku}: Already has ${existing.length} identifiers, skipping`);
                skipped++;
                continue;
            }

            console.log(`   📝 ${sku}: Adding ${identifiers.length} identifiers`);
            for (const id of identifiers) {
                console.log(`      - ${id.Channel}: ${id.Identifier}`);
            }

            try {
                await updateProduct(product.id, identifiers);
                updated++;
                totalIdentifiersAdded += identifiers.length;
            } catch (error) {
                console.error(`   ❌ Failed to update ${sku}: ${error.message}`);
            }

            await new Promise(r => setTimeout(r, 300));
        }

        // Summary
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 POPULATION SUMMARY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ Products updated: ${updated}`);
        console.log(`⏭️  Products skipped (already have identifiers): ${skipped}`);
        console.log(`❌ Products not found in Excel: ${notFound}`);
        console.log(`📊 Total identifiers added: ${totalIdentifiersAdded}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('\n❌ Error:', error.response?.data || error.message);
        throw error;
    }
}

populateIdentifiers()
    .then(() => {
        console.log('✅ Population complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    });
