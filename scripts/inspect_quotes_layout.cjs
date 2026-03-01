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

async function inspectLayout() {
    const token = await getAccessToken();
    console.log(`Inspecting Layout for ${CONFIG.module}...`);

    try {
        const response = await axios.get(`${CONFIG.apiDomain}/crm/v3/settings/layouts?module=${CONFIG.module}`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
        });

        const layouts = response.data.layouts;
        console.log(`Found ${layouts.length} Layouts.`);

        for (const layout of layouts) {
            console.log(`\nLayout: ${layout.name} (ID: ${layout.id})`);

            for (const section of layout.sections) {
                // Check if section is the Subform
                if (section.name === 'Quoted Items' || section.api_name === 'Quoted_Items') {
                    console.log(`  🔎 Found Section: ${section.display_label}`);

                    for (const field of section.fields) {
                        console.log(`     Field: ${field.display_label} (API: ${field.api_name}, Type: ${field.data_type})`);
                        if (field.lookup) {
                            console.log(`        Lookup:`, JSON.stringify(field.lookup));
                        }
                    }
                }
            }
        }

    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
    }
}

inspectLayout();
