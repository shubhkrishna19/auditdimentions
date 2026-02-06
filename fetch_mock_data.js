
import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

async function refreshAccessToken() {
    try {
        const url = `${process.env.ZOHO_ACCOUNTS_URL}/oauth/v2/token?refresh_token=${process.env.ZOHO_REFRESH_TOKEN}&client_id=${process.env.ZOHO_CLIENT_ID}&client_secret=${process.env.ZOHO_CLIENT_SECRET}&grant_type=refresh_token`;
        const response = await axios.post(url);
        return response.data.access_token;
    } catch (error) {
        console.error("❌ Token Refresh Failed:", error.message);
        process.exit(1);
    }
}

async function fetchMockData() {
    console.log('🔑 Generating Token...');
    const accessToken = await refreshAccessToken();
    const headers = { 'Authorization': `Zoho-oauthtoken ${accessToken}` };

    console.log('🔍 Fetching 20 Products...');
    // Sorting by Created_Time desc to get interesting ones, or just page 1
    const response = await axios.get(`${ZOHO_API_DOMAIN}/crm/v2/Parent_MTP_SKU?per_page=20`, { headers });

    if (response.data.data) {
        const mockData = response.data.data;
        const fileContent = `// Mock Data Generation Date: ${new Date().toISOString()}\nexport const MOCK_PRODUCTS = ${JSON.stringify(mockData, null, 2)};`;
        fs.writeFileSync('src/services/mockData.js', fileContent);
        console.log(`✅ Saved ${mockData.length} records to src/services/mockData.js`);
    } else {
        console.log('❌ No data found');
    }
}

fetchMockData();
