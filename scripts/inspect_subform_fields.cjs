const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const CONFIG = {
    authDomain: 'https://accounts.zoho.com',
    apiDomain: 'https://www.zohoapis.com',
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
    module: 'Quoted_Items'
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

async function inspectFields() {
    const token = await getAccessToken();
    console.log(`Inspecting Fields for ${CONFIG.module}...`);

    try {
        const response = await axios.get(`${CONFIG.apiDomain}/crm/v3/settings/fields?module=${CONFIG.module}`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
        });

        const fields = response.data.fields;
        console.log(`Found ${fields.length} Fields.`);

        fields.forEach(f => {
            console.log(`\nField: ${f.display_label} (API: ${f.api_name})`);
            console.log(`  Type: ${f.data_type}`);
            if (f.lookup) {
                console.log(`  Lookup Target: ${f.lookup.module?.api_name}`);
                console.log(`  Query Details:`, JSON.stringify(f.lookup.query_details));
            }
        });

    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
    }
}

inspectFields();
