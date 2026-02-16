import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const CONFIG = {
    apiDomain: process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com',
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN
};

async function getAccessToken() {
    try {
        const url = `https://accounts.zoho.com/oauth/v2/token?refresh_token=${CONFIG.refreshToken}&client_id=${CONFIG.clientId}&client_secret=${CONFIG.clientSecret}&grant_type=refresh_token`;
        const response = await axios.post(url);
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Data Access Error:', error.message);
        process.exit(1);
    }
}

async function inspectModule(module) {
    const token = await getAccessToken();
    try {
        console.log(`\n🔍 Fetching one record from ${module}...`);
        const response = await axios.get(`${CONFIG.apiDomain}/crm/v3/${module}`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
            params: { per_page: 1 }
        });
        const record = response.data?.data?.[0];
        if (record) {
            console.log('--- FOUND RECORD KEYS ---');
            console.log(itemToKeyMap(record));
            console.log('--- RAW PRICE FIELDS ---');
            console.log(Object.keys(record).filter(k => k.toLowerCase().includes('price') || k.toLowerCase().includes('mrp')));
        } else {
            console.log('No records found.');
        }
    } catch (error) {
        console.error(`❌ Error fetching ${module}:`, error.message);
    }
}

function itemToKeyMap(obj) {
    return Object.keys(obj).sort().join(', ');
}

async function run() {
    await inspectModule('Parent_MTP_SKU');
    await inspectModule('Products');
}

run();
