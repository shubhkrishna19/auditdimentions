
import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const CONFIG = {
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
    apiDomain: 'https://www.zohoapis.com'
};

let accessToken = null;
async function getAccessToken() {
    if (accessToken) return accessToken;
    try {
        const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
            params: {
                refresh_token: CONFIG.refreshToken,
                client_id: CONFIG.clientId,
                client_secret: CONFIG.clientSecret,
                grant_type: 'refresh_token'
            }
        });
        accessToken = response.data.access_token;
        return accessToken;
    } catch (error) {
        console.error('❌ Token Error:', error.message);
        process.exit(1);
    }
}

async function inspect() {
    console.log('🔍 Fetching Fields & Related Lists...');
    const token = await getAccessToken();

    // 1. Fetch Fields for PRODUCTS
    try {
        const fieldsRes = await axios.get(`${CONFIG.apiDomain}/crm/v3/settings/fields`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
            params: { module: 'Products' }
        });

        const fields = fieldsRes.data.fields;
        console.log(`\n📋 Products Module: Found ${fields.length} Fields`);
        fs.writeFileSync('product_fields.json', JSON.stringify(fields, null, 2));
        console.log('   ✅ Saved to product_fields.json');

    } catch (error) {
        console.error('❌ Products Fields Fetch Failed:', error.message);
    }

    // 2. Fetch Fields for Product_Identifiers
    try {
        const fieldsRes = await axios.get(`${CONFIG.apiDomain}/crm/v3/settings/fields`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
            params: { module: 'Product_Identifiers' }
        });

        const fields = fieldsRes.data.fields;
        console.log(`\n📋 Product_Identifiers Module: Found ${fields.length} Fields`);
        fs.writeFileSync('identifier_fields.json', JSON.stringify(fields, null, 2));
        console.log('   ✅ Saved to identifier_fields.json');

        fields.forEach(f => {
            console.log(`   - ${f.display_label} (API: ${f.api_name}, Type: ${f.data_type})`);
            if (f.pick_list_values) {
                console.log(`     Values: ${f.pick_list_values.map(v => v.display_value).join(', ')}`);
            }
        });

    } catch (error) {
        console.error('❌ Products Fields Fetch Failed:', error.message);
    }

    // 3. Fetch ALL Modules
    try {
        const modulesRes = await axios.get(`${CONFIG.apiDomain}/crm/v3/settings/modules`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
        });
        const modules = modulesRes.data.modules;
        console.log(`\n📦 Found ${modules.length} Modules`);
        modules.forEach(m => {
            console.log(`   - ${m.plural_label} (API: ${m.api_name}, ID: ${m.id})`);
        });
    } catch (error) {
        console.error('❌ Modules Fetch Failed:', error.message);
    }

    // 5. Fetch Related Lists for PARENT
    try {
        const relatedRes = await axios.get(`${CONFIG.apiDomain}/crm/v3/settings/related_lists`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
            params: { module: 'Parent_MTP_SKU' }
        });

        const relatedLists = relatedRes.data.related_lists;
        console.log(`\n🔗 Parent Related Lists (${relatedLists.length}):`);
        relatedLists.forEach(r => {
            console.log(`   - ${r.display_label} (API: ${r.api_name}, Module: ${r.module})`);
        });

    } catch (error) {
        console.error('❌ Related Lists Fetch Failed:', error.message);
    }

}

inspect();
