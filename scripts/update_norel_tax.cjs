const axios = require('axios');
require('dotenv').config();

const CONFIG = {
    authDomain: 'https://accounts.zoho.com',
    apiDomain: 'https://www.zohoapis.com',
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
    sku: 'TS-NL-LA',
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

async function updateTax() {
    const token = await getAccessToken();
    const ids = ['4301492000081747078', '4301492000081688866', '4301492000081704479'];

    console.log(`Updating Tax for ${ids.length} products...`);

    for (const id of ids) {
        try {
            const payload = {
                data: [{
                    id: id,
                    Tax: [{ id: CONFIG.taxId, value: CONFIG.taxValue }]
                }]
            };

            const updateRes = await axios.put(`${CONFIG.apiDomain}/crm/v3/Products/${id}`, payload, {
                headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
            });

            if (updateRes.data.data && updateRes.data.data[0].code === 'SUCCESS') {
                console.log(`✅ Tax Updated for ID ${id}`);
            } else {
                console.log(`❌ Update Failed for ID ${id}:`, updateRes.data.data[0]);
            }
        } catch (error) {
            console.error(`❌ API Error for ID ${id}:`, error.message);
        }
    }
}

updateTax();
