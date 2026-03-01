const axios = require('axios');
require('dotenv').config();

const CONFIG = {
    authDomain: 'https://accounts.zoho.com',
    apiDomain: 'https://www.zohoapis.com',
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN
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

async function listModules() {
    const token = await getAccessToken();
    console.log('Fetching Modules List...');

    try {
        const response = await axios.get(`${CONFIG.apiDomain}/crm/v3/settings/modules`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
        });

        const modules = response.data.modules;
        console.log(`Found ${modules.length} Modules:`);

        modules.forEach(m => {
            console.log(`- Label: "${m.plural_label}" / "${m.singular_label}"`);
            console.log(`  API Name: ${m.api_name}`);
            console.log(`  Generated: ${m.generated_type}`); // 'default' or 'custom'
            console.log(`  ID: ${m.id}`);
            if (m.api_name === 'Products') {
                console.log('  👉 THIS IS THE TARGET MODULE WE USED');
            }
            console.log('---');
        });

    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
    }
}

listModules();
