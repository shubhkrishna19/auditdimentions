const axios = require('axios');
require('dotenv').config();

const CONFIG = {
    authDomain: 'https://accounts.zoho.com',
    apiDomain: 'https://www.zohoapis.com',
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
    skuToCheck: 'TU-WBM-MF' // Known existing SKU
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

async function checkProductVisibility() {
    const token = await getAccessToken();
    console.log(`Searching for Product Name containing 'Norel'...`);

    try {
        // Search by Name "Norel"
        const response = await axios.get(`${CONFIG.apiDomain}/crm/v3/Products/search?criteria=(Product_Name:starts_with:Norel)`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
        });

        if (response.data.data && response.data.data.length > 0) {
            console.log(`\n✅ Found ${response.data.data.length} Products:`);
            response.data.data.forEach(product => {
                console.log(`   - Name: ${product.Product_Name}`);
                console.log(`     Code: ${product.Product_Code}`);
                console.log(`     ID: ${product.id}`);
                console.log(`     Stock: ${product.Qty_in_Stock}`);
                console.log(`     Tax: ${JSON.stringify(product.Tax)}`);
                console.log('---');
            });
        } else {
            console.log('❌ Product NOT found by search.');
        }

    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
    }
}

checkProductVisibility();
