
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Checking Zoho Auth...');

async function check() {
    try {
        const url = `${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/token?refresh_token=${process.env.ZOHO_REFRESH_TOKEN}&client_id=${process.env.ZOHO_CLIENT_ID}&client_secret=${process.env.ZOHO_CLIENT_SECRET}&grant_type=refresh_token`;
        console.log('POST', url);
        const response = await axios.post(url);
        console.log('✅ Access Token Generated:', response.data.access_token ? 'Yes' : 'No');

        if (response.data.access_token) {
            console.log('Testing API call...');
            const headers = { 'Authorization': `Zoho-oauthtoken ${response.data.access_token}` };
            const apiRes = await axios.get(`${process.env.ZOHO_API_DOMAIN}/crm/v2/settings/modules`, { headers });
            console.log('✅ API Call Success! Modules:', apiRes.data.modules.length);
        }
    } catch (error) {
        console.error('❌ Error:');
        if (error.response) {
            console.error(error.response.status, error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

check();
