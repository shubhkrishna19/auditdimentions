/**
 * Exchange authorization code for refresh token
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const CONFIG = {
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    authCode: process.env.ZOHO_AUTH_CODE // one-time code,
    redirectUri: 'https://www.zoho.com/crm' // Use the same redirect URI from your OAuth app
};

async function getRefreshToken() {
    console.log('🔄 Exchanging authorization code for refresh token...\n');

    try {
        const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
            params: {
                code: CONFIG.authCode,
                client_id: CONFIG.clientId,
                client_secret: CONFIG.clientSecret,
                redirect_uri: CONFIG.redirectUri,
                grant_type: 'authorization_code'
            }
        });

        console.log('✅ Success!\n');
        console.log('Access Token:', response.data.access_token);
        console.log('\n🔑 REFRESH TOKEN (save this):');
        console.log(response.data.refresh_token);
        console.log('\nAdd this to your .env file as:');
        console.log(`ZOHO_REFRESH_TOKEN=${response.data.refresh_token}`);

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);

        if (error.response?.data?.error === 'invalid_code') {
            console.log('\n⚠️ The authorization code has expired or already been used.');
            console.log('Please generate a new one from: https://api-console.zoho.com/');
        }
    }
}

getRefreshToken();
