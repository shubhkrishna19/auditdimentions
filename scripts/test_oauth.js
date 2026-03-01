/**
 * Test OAuth token and diagnose the 400 error
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const CONFIG = {
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
    apiDomain: 'https://www.zohoapis.com'
};

async function testOAuth() {
    console.log('🔑 Testing OAuth token refresh...\n');

    try {
        const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
            params: {
                refresh_token: CONFIG.refreshToken,
                client_id: CONFIG.clientId,
                client_secret: CONFIG.clientSecret,
                grant_type: 'refresh_token'
            }
        });

        const accessToken = response.data.access_token;
        console.log('✅ Access token obtained successfully!');
        console.log(`Token: ${accessToken.substring(0, 20)}...`);

        // Test a simple API call
        console.log('\n📡 Testing API call to fetch 1 parent...');
        const testResponse = await axios.get(`${CONFIG.apiDomain}/crm/v3/Parent_MTP_SKU`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
            params: { per_page: 1 }
        });

        console.log('✅ API call successful!');
        console.log(`Found ${testResponse.data?.data?.length || 0} records`);

        if (testResponse.data?.data?.[0]) {
            const record = testResponse.data.data[0];
            console.log(`\nSample record: ${record.Name} (ID: ${record.id})`);
            console.log(`Boxes: ${record.MTP_Box_Dimensions?.length || 0}`);
        }

        return true;
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);

        if (error.response?.status === 400) {
            console.log('\n⚠️ 400 Error - Possible causes:');
            console.log('1. Refresh token expired - needs regeneration');
            console.log('2. Client ID/Secret mismatch');
            console.log('3. Missing scopes');
        }

        return false;
    }
}

testOAuth();
