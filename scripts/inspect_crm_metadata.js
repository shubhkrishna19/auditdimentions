
import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const CONFIG = {
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
    apiDomain: 'https://www.zohoapis.com'
};

/* 
    Reuse token logic 
*/
let accessToken = null;
async function getAccessToken() {
    if (accessToken) return accessToken;
    console.log('🔑 Getting Access Token...');
    try {
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
    } catch (error) {
        console.error('❌ Token Error:', error.response?.data || error.message);
        process.exit(1);
    }
}

async function inspect() {
    console.log('🔍 Inspecting CRM Metadata & Data...\n');
    const token = await getAccessToken();

    // 1. Fetch Layouts to see Field Names
    console.log('📋 Fetching Products Layout...');
    try {
        const layoutRes = await axios.get(`${CONFIG.apiDomain}/crm/v3/settings/layouts`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
            params: { module: 'Products' }
        });

        const layout = layoutRes.data.layouts[0]; // Assuming one main layout
        fs.writeFileSync('layout_dump.json', JSON.stringify(layout, null, 2));
        console.log('   ✅ Saved layout to layout_dump.json');

        // Look for Subforms in layout
        const sections = layout.sections;
        console.log('\n--- MODULE SECTIONS ---');
        sections.forEach(section => {
            console.log(`[${section.display_label}]`);
            section.fields.forEach(field => {
                if (field.data_type === 'subform' || field.api_name.includes('Identifier')) {
                    console.log(`   - ${field.display_label} (API: ${field.api_name}, Type: ${field.data_type}, ID: ${field.id})`);
                }
            });
        });

    } catch (error) {
        console.error('❌ Layout Fetch Failed:', error.response?.data || error.message);
    }

    // 2. Fetch Specific Product
    const sku = "S-MO-W5";
    console.log(`\n📦 Fetching Product: ${sku}...`);

    // First search ID
    try {
        const searchRes = await axios.get(`${CONFIG.apiDomain}/crm/v3/Products/search`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
            params: { criteria: `(Product_Code:equals:${sku})` }
        });

        if (searchRes.data.data) {
            const product = searchRes.data.data[0];
            const pId = product.id;
            console.log(`   Found ID: ${pId}`);

            // Get Full Record
            const recordRes = await axios.get(`${CONFIG.apiDomain}/crm/v3/Products/${pId}`, {
                headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
            });
            const fullRecord = recordRes.data.data[0];
            fs.writeFileSync('product_dump.json', JSON.stringify(fullRecord, null, 2));
            console.log('   ✅ Saved product to product_dump.json');

            console.log('\n--- RAW DATA INSPECTION ---');
            // Check for any field looking like "Identifier" or array
            Object.keys(fullRecord).forEach(key => {
                const val = fullRecord[key];
                if (Array.isArray(val) && typeof val[0] === 'object') {
                    console.log(`Field: ${key} (Array length: ${val.length})`);
                    console.log(JSON.stringify(val, null, 2).substring(0, 500) + '...');
                }
            });

        } else {
            console.log('   ❌ Product not found');
        }

    } catch (error) {
        console.error('❌ Product Fetch Failed:', error.response?.data || error.message);
    }
}

inspect();
