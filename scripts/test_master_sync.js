import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const CONFIG = {
    apiDomain: process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com',
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
    delayMs: 300
};

class ZohoPusher {
    constructor() {
        this.accessToken = null;
    }

    async getAccessToken() {
        if (this.accessToken) return this.accessToken;
        try {
            const url = `https://accounts.zoho.com/oauth/v2/token?refresh_token=${CONFIG.refreshToken}&client_id=${CONFIG.clientId}&client_secret=${CONFIG.clientSecret}&grant_type=refresh_token`;
            const response = await axios.post(url);
            this.accessToken = response.data.access_token;
            return this.accessToken;
        } catch (error) {
            console.error('❌ Data Access Error:', error.message);
            process.exit(1);
        }
    }

    async searchRecord(module, sku) {
        const token = await this.getAccessToken();
        try {
            const response = await axios.get(`${CONFIG.apiDomain}/crm/v3/${module}/search`, {
                headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
                params: { criteria: `(Product_Code:equals:${sku})` }
            });
            return response.data?.data?.[0]?.id || null;
        } catch (error) {
            return null;
        }
    }

    async updateRecord(module, recordId, payload) {
        if (!recordId) return false;
        const token = await this.getAccessToken();
        try {
            const response = await axios.put(`${CONFIG.apiDomain}/crm/v3/${module}/${recordId}`, {
                data: [payload]
            }, {
                headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
            });
            const result = response.data?.data?.[0];
            if (result?.code === 'SUCCESS') return true;

            console.log(`\n❌ [${module}] Error for ${recordId}: ${JSON.stringify(result, null, 2)}`);
            return false;
        } catch (error) {
            // console.error(`\n❌ [${module}] Exception for ${recordId}:`, JSON.stringify(error.response?.data || error.message, null, 2));
            console.error(`\n❌ [${module}] Exception: ${error.message}`);
            if (error.response?.data) console.log(JSON.stringify(error.response.data, null, 2));
            return false;
        }
    }

    async createRecord(module, payload) {
        const token = await this.getAccessToken();
        try {
            const response = await axios.post(`${CONFIG.apiDomain}/crm/v3/${module}`, {
                data: [payload]
            }, {
                headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
            });
            const result = response.data?.data?.[0];
            if (result?.code === 'SUCCESS') return result.details?.id;

            console.log(`\n❌ [${module}] Create Error: ${JSON.stringify(result, null, 2)}`);
            return null;
        } catch (error) {
            console.error(`\n❌ [${module}] Create Exception:`, JSON.stringify(error.response?.data || error.message, null, 2));
            return null;
        }
    }
}

async function runTest() {
    const pusher = new ZohoPusher();
    console.log('📦 Loading UNIFIED Master Data...');
    const products = JSON.parse(fs.readFileSync('./unified_master_data.json', 'utf8'));

    // FILTER FOR TEST: Pick 1 Child with Identifiers + 1 Parent
    const testProducts = [
        products.find(p => p.type === 'Child' && p.identifiers.Amazon_ASIN),
        products.find(p => p.type === 'Parent')
    ].filter(Boolean);

    console.log(`🚀 Starting TEST Sync for ${testProducts.length} products...\n`);

    for (let i = 0; i < testProducts.length; i++) {
        const item = testProducts[i];
        const sku = item.sku;
        const type = item.type;

        process.stdout.write(`\n[Tested: ${i + 1}] Processing ${sku} (${type})... `);

        let module = (type === 'Parent') ? 'Parent_MTP_SKU' : 'Products';
        let recordId = await pusher.searchRecord(module, sku);

        const weightKG = item.dimensions.weightKg;
        const weightGrams = item.dimensions.physicalGrams;
        const payload = {};

        if (module === 'Parent_MTP_SKU') {
            // ... duplicate logic safely ...
            payload.Product_Code = item.sku;
            payload.Unit_Price = item.commercial.mrp || 0;
            // Just key fields for test
            payload.Billed_Physical_Weight = weightGrams;
        } else {
            payload.Product_Code = item.sku;
            payload.Unit_Price = item.commercial.mrp || 0;
            if (item.identifiers) {
                if (item.identifiers.Amazon_ASIN) payload.Amazon_ASIN = item.identifiers.Amazon_ASIN;
                if (item.identifiers.FK_FSN) payload.FK_FSN_L = item.identifiers.FK_FSN;
            }
        }

        if (recordId) {
            payload.id = recordId;
            const success = await pusher.updateRecord(module, recordId, payload);
            if (success) process.stdout.write(`✅ Updated `);
        } else {
            // For test, skip create to avoid partial data if fields missing
            console.log(`(Skipping Create in Test Mode)`);
        }
    }
    console.log('\nDone.');
}

runTest();
