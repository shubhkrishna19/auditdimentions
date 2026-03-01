import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const CONFIG = {
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
    apiDomain: process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com',
    batchSize: 10,
    delayMs: 300
};

class ZohoPusher {
    constructor() {
        this.accessToken = null;
    }

    async getAccessToken() {
        if (this.accessToken) return this.accessToken;
        console.log('🔑 Refreshing Access Token...');
        try {
            const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
                params: {
                    refresh_token: CONFIG.refreshToken,
                    client_id: CONFIG.clientId,
                    client_secret: CONFIG.clientSecret,
                    grant_type: 'refresh_token'
                }
            });
            this.accessToken = response.data.access_token;
            return this.accessToken;
        } catch (error) {
            console.error('❌ Failed to get access token:', error.response?.data || error.message);
            throw error;
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
            // If module doesn't exist or other error, return null
            return null;
        }
    }

    async getChildren(parentId) {
        const token = await this.getAccessToken();
        try {
            const response = await axios.get(`${CONFIG.apiDomain}/crm/v3/Products/search`, {
                headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
                params: { criteria: `(MTP_SKU:equals:${parentId})` }
            });
            return response.data?.data || [];
        } catch (error) {
            return [];
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
            console.error(`\n❌ [${module}] Exception for ${recordId}:`, JSON.stringify(error.response?.data || error.message, null, 2));
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

async function run() {
    const pusher = new ZohoPusher();
    console.log('📦 Loading UNIFIED Master Data...');
    const products = JSON.parse(fs.readFileSync('./unified_master_data.json', 'utf8'));
    console.log(`🚀 Starting Master Sync for ${products.length} products...\n`);

    const stats = { found: 0, created: 0, updated: 0, failed: 0, skipped: 0 };

    for (let i = 0; i < products.length; i++) {
        const item = products[i];
        const sku = item.sku;

        try {
            process.stdout.write(`\n[${i + 1}/${products.length}] Processing ${sku}... `);

            // 1. Determine Module
            const module = item.module;

            // 2. Search Record
            let recordId = await pusher.searchRecord(module, sku);

            // 3. Prepare Payload
            const weightKG = item.dimensions.totalWeightKg;
            const payload = {
                id: recordId
            };

            if (module === 'Parent_MTP_SKU') {
                payload.Name = sku; // API Name for 'MTP SKU' column (Mandatory)
                payload.Product_MTP_Name = item.name || sku;
                payload.Unit_Price = item.mrp || 0;
                payload.MRP = item.mrp || 0;
                payload.Weight_Category_Billed = item.category; // Weight slab for shipping
                payload.Child_Count = item.childCount || 0; // Newly confirmed field
                payload.ProductActive = item.isActive ? 'Active Product' : 'Discontinued Product'; // Derived Aggregation

                if (item.dimensions.boxes?.length > 0) {
                    payload.MTP_Box_Dimensions = item.dimensions.boxes.map((b, idx) => ({
                        Box: String(idx + 1),
                        Length: b.length,
                        Width: b.width,
                        Height: b.height,
                        Weight: parseFloat((b.weightGrams / 1000).toFixed(2)), // Convert grams to kg
                        Box_Measurement: 'cm',
                        Weight_Measurement: 'kg' // Changed from 'Gram' to 'kg'
                    }));
                }
            } else {
                const roundedKG = parseFloat(weightKG.toFixed(2));
                payload.Product_Name = item.name || sku;
                payload.Product_Code = sku;
                payload.Last_Audited_Total_Weight_kg = roundedKG;
                payload.Total_Weight = roundedKG;
                payload.MRP = item.mrp || 0;
                payload.Unit_Price = item.mrp || 0;
                payload.Product_Active = true; // Boolean legacy field
                payload.Live_Status = item.liveStatus; // Picklist: Y, YB, DI, etc.
                payload.Weight_Category_Billed = item.dimensions.category; // Weight slab for shipping

                // Established Parent Link via Lookup
                if (item.parentSku) {
                    process.stdout.write(`(Linking to ${item.parentSku})... `);
                    const parentId = await pusher.searchRecord('Parent_MTP_SKU', item.parentSku);
                    if (parentId) {
                        payload.MTP_SKU = parentId; // Link via Zoho ID
                    }
                }

                if (item.identifiers && item.identifiers.length > 0) {
                    payload.Product_Identifiers = item.identifiers;
                }

                if (item.dimensions.boxes?.length > 0) {
                    payload.Bill_Dimension_Weight = item.dimensions.boxes.map((b, idx) => ({
                        BL: String(idx + 1),
                        Length: b.length,
                        Width: b.width,
                        Height: b.height,
                        Weight: parseFloat((b.weightGrams / 1000).toFixed(2)),
                        Box_Measurement: 'cm',
                        Weight_Measurement: 'kg'
                    }));
                }
            }

            // 4. Update or Create
            if (recordId) {
                const success = await pusher.updateRecord(module, recordId, payload);
                if (success) {
                    process.stdout.write(`✅ Updated `);
                    stats.updated++;
                } else {
                    stats.failed++;
                }
            } else {
                process.stdout.write('🆕 Creating... ');
                const newId = await pusher.createRecord(module, payload);
                if (newId) {
                    process.stdout.write(`✅ Created! `);
                    stats.created++;
                } else {
                    stats.failed++;
                }
            }
        } catch (err) {
            stats.failed++;
            console.error(`\n❌ [${sku}] Failed: ${err.message}`);
        }

        await new Promise(r => setTimeout(r, CONFIG.delayMs));
    }

    console.log('\n' + '='.repeat(40));
    console.log('🏁 MASTER SYNC COMPLETE');
    console.log('='.repeat(40));
    console.log(`Total Processed: ${products.length}`);
    console.log(`Found Existing:  ${stats.found}`);
    console.log(`Created New:     ${stats.created}`);
    console.log(`Updated:         ${stats.updated}`);
    console.log(`Failed:          ${stats.failed}`);
    console.log('='.repeat(40));
}

run().catch(console.error);
