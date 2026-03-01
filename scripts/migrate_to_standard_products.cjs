/**
 * Migrate Custom Products Module to Standard Zoho Products Module
 *
 * This script:
 * 1. Reads all records from your custom "Products" module using MCP
 * 2. Creates/updates them in the standard "Products" module using Direct OAuth API
 * 3. Enables products to appear in Quotes, Invoices, Sales Orders automatically
 *
 * Prerequisites:
 * - Standard Products module must have custom fields created:
 *   - Product_Category (Single Line)
 *   - Weight_Category_Billed (Single Line)
 *   - Total_Weight (Decimal)
 *   - Billed_Physical_Weight (Decimal)
 *   - MTP_SKU (Lookup to Parent_MTP_SKU)
 *   - Live_Status (Single Line)
 *   - Bill_Dimension_Weight (Subform - with L, W, H, Weight fields)
 */

require('dotenv').config({ path: '.env.mcp' });
const axios = require('axios');

// ============================================
// Configuration
// ============================================
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;

const SOURCE_MODULE = 'Products'; // Your custom module
const TARGET_MODULE = 'Products'; // Standard Zoho Products module (same name but different API name)
const DRY_RUN = true; // Set to false to actually write data

// ============================================
// OAuth Token Management
// ============================================
let cachedToken = null;
let tokenExpiry = null;

async function getAccessToken() {
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    console.log('🔑 Fetching new access token...');
    const response = await axios.post(
        'https://accounts.zoho.com/oauth/v2/token',
        null,
        {
            params: {
                refresh_token: ZOHO_REFRESH_TOKEN,
                client_id: ZOHO_CLIENT_ID,
                client_secret: ZOHO_CLIENT_SECRET,
                grant_type: 'refresh_token'
            }
        }
    );

    cachedToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;

    console.log('✅ Access token obtained');
    return cachedToken;
}

// ============================================
// Fetch All Records with Pagination
// ============================================
async function fetchAllRecords(module, accessToken) {
    let allRecords = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        console.log(`📖 Fetching page ${page} from ${module}...`);

        const response = await axios.get(
            `https://www.zohoapis.com/crm/v2/${module}`,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${accessToken}`
                },
                params: {
                    page,
                    per_page: 200,
                    fields: 'all'
                }
            }
        );

        const records = response.data.data || [];
        allRecords = allRecords.concat(records);

        console.log(`   ✅ Fetched ${records.length} records (total: ${allRecords.length})`);

        // Check if there are more pages
        hasMore = response.data.info && response.data.info.more_records;
        page++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    return allRecords;
}

// ============================================
// Map Custom Product to Standard Product
// ============================================
function mapToStandardProduct(customProduct) {
    return {
        // Standard Fields
        Product_Name: customProduct.Product_Name || customProduct.Name,
        Product_Code: customProduct.Product_Code || customProduct.id,
        Unit_Price: customProduct.Unit_Price || 0,
        Description: customProduct.Description || '',
        Product_Active: customProduct.Live_Status === 'Y' || customProduct.Live_Status === 'Live',

        // Custom Fields (must exist in standard Products module!)
        Product_Category: customProduct.Product_Category,
        Weight_Category_Billed: customProduct.Weight_Category_Billed,
        Total_Weight: customProduct.Total_Weight,
        Billed_Physical_Weight: customProduct.Billed_Physical_Weight,
        Live_Status: customProduct.Live_Status,

        // Lookup to Parent (if exists)
        MTP_SKU: customProduct.MTP_SKU ? {
            id: customProduct.MTP_SKU.id,
            name: customProduct.MTP_SKU.name
        } : null,

        // Subform data (Bill_Dimension_Weight)
        Bill_Dimension_Weight: customProduct.Bill_Dimension_Weight || []
    };
}

// ============================================
// Create/Update Product in Standard Module
// ============================================
async function upsertStandardProduct(product, accessToken) {
    // Check if product already exists (by Product_Code)
    const searchResponse = await axios.get(
        `https://www.zohoapis.com/crm/v2/Products/search`,
        {
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`
            },
            params: {
                criteria: `(Product_Code:equals:${product.Product_Code})`
            }
        }
    );

    const existingProducts = searchResponse.data.data || [];

    if (existingProducts.length > 0) {
        // Update existing product
        const existingId = existingProducts[0].id;
        console.log(`   🔄 Updating existing product: ${product.Product_Code} (ID: ${existingId})`);

        if (DRY_RUN) {
            console.log('   ⚠️ DRY RUN - Skipping actual update');
            return { action: 'update', id: existingId, status: 'dry_run' };
        }

        const response = await axios.put(
            `https://www.zohoapis.com/crm/v2/Products/${existingId}`,
            {
                data: [product]
            },
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return { action: 'update', id: existingId, status: response.data.data[0].code };
    } else {
        // Create new product
        console.log(`   ✨ Creating new product: ${product.Product_Code}`);

        if (DRY_RUN) {
            console.log('   ⚠️ DRY RUN - Skipping actual creation');
            return { action: 'create', status: 'dry_run' };
        }

        const response = await axios.post(
            `https://www.zohoapis.com/crm/v2/Products`,
            {
                data: [product]
            },
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return { action: 'create', id: response.data.data[0].details.id, status: response.data.data[0].code };
    }
}

// ============================================
// Main Migration Script
// ============================================
async function migrateProducts() {
    console.log('🚀 Starting Product Migration to Standard Products Module\n');
    console.log(`⚠️ DRY RUN MODE: ${DRY_RUN ? 'ENABLED (no data will be written)' : 'DISABLED (will write data!)'}\n`);

    try {
        // Step 1: Get access token
        const accessToken = await getAccessToken();

        // Step 2: Fetch all products from custom module
        console.log(`\n📖 Reading all products from custom "${SOURCE_MODULE}" module...`);
        const customProducts = await fetchAllRecords(SOURCE_MODULE, accessToken);
        console.log(`✅ Fetched ${customProducts.length} products from custom module\n`);

        // Step 3: Migrate each product
        console.log(`🔄 Migrating products to standard Products module...\n`);
        let created = 0;
        let updated = 0;
        let failed = 0;

        for (let i = 0; i < customProducts.length; i++) {
            const customProduct = customProducts[i];

            try {
                const standardProduct = mapToStandardProduct(customProduct);
                const result = await upsertStandardProduct(standardProduct, accessToken);

                if (result.action === 'create') {
                    created++;
                } else if (result.action === 'update') {
                    updated++;
                }

                // Progress indicator
                if ((i + 1) % 10 === 0) {
                    console.log(`\n   Progress: ${i + 1}/${customProducts.length} products processed\n`);
                }

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                failed++;
                console.error(`   ❌ Failed to migrate ${customProduct.Product_Code}:`, error.message);
            }
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 MIGRATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Products Created: ${created}`);
        console.log(`🔄 Products Updated: ${updated}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📦 Total Processed: ${customProducts.length}`);

        if (DRY_RUN) {
            console.log('\n⚠️  DRY RUN MODE - No data was actually written!');
            console.log('💡 Set DRY_RUN = false in the script to execute the migration.');
        } else {
            console.log('\n✅ Migration completed successfully!');
            console.log('🎯 Products are now available in Quotes, Invoices, and Sales Orders.');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        process.exit(1);
    }
}

// Run migration
migrateProducts();
