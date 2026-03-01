const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const CONFIG = {
    authDomain: 'https://accounts.zoho.com',
    apiDomain: 'https://www.zohoapis.com',
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
    module: 'Quotes'
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

async function inspectModuleFields() {
    const token = await getAccessToken();
    console.log(`Inspecting ${CONFIG.module} Module...`);

    try {
        const response = await axios.get(`${CONFIG.apiDomain}/crm/v3/settings/fields?module=${CONFIG.module}`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
        });

        const fields = response.data.fields;
        console.log(`Found ${fields.length} fields.`);

        // Find lookup fields pointing to Products
        const productLookups = fields.filter(f =>
            (f.lookup && f.lookup.module && f.lookup.module.api_name === 'Products') ||
            f.api_name === 'Product_Name' ||
            f.display_label.includes('Product')
        );

        console.log('\nProduct Related Lookups:');
        productLookups.forEach(f => {
            console.log(`- ${f.display_label} (API: ${f.api_name})`);
            console.log(`  Type: ${f.data_type}`);
            if (f.lookup) console.log(`  Lookup Target: ${f.lookup.module?.api_name}`);
        });

        // Also check Quoted_Items subform if it exists
        const quotedItems = fields.find(f => f.api_name === 'Quoted_Items');
        if (quotedItems) {
            console.log('\nQuoted Items Subform Found (API: Quoted_Items)');
            // We can't see subform structure here directly, usually requires separate call or detailed view
        }

    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
    }
}

inspectModuleFields();
