/**
 * Populate Product Identifiers from SKU Aliases Excel
 *
 * Reads the "Child SKU Master" sheet from the SKU Aliases Excel file
 * and populates the Product_Identifiers subform in Products module.
 *
 * Product_Identifiers subform has:
 * - Channel: Platform name (Amazon ASIN, Flipkart FSN, Urban Ladder, Pepperfry, Myntra)
 * - Identifier: Platform-specific product ID
 */

require('dotenv').config({ path: '.env.mcp' });
const XLSX = require('xlsx');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const fs = require('fs');

const EXCEL_PATH = './scripts/SKU Aliases, Parent & Child Master Data LATEST .xlsx';

// MCP Tool Call Helper
async function callMCPTool(client, toolName, args) {
    const response = await client.callTool({ name: toolName, arguments: args });

    if (response.isError) {
        throw new Error(`MCP Error: ${response.content?.[0]?.text || 'Unknown error'}`);
    }

    const textContent = response.content?.find(c => c.type === 'text')?.text;
    if (!textContent) return null;

    try {
        return JSON.parse(textContent);
    } catch {
        return textContent;
    }
}

// Parse Excel to extract product identifiers
function parseProductIdentifiers() {
    console.log(`📖 Reading Excel: ${EXCEL_PATH}`);

    if (!fs.existsSync(EXCEL_PATH)) {
        throw new Error(`Excel file not found: ${EXCEL_PATH}`);
    }

    const workbook = XLSX.readFile(EXCEL_PATH);

    // Try to find the Child SKU Master sheet
    const sheetNames = workbook.SheetNames;
    console.log(`   Found sheets: ${sheetNames.join(', ')}`);

    let sheetName = sheetNames.find(s =>
        s.toLowerCase().includes('child') ||
        s.toLowerCase().includes('sku') ||
        s.toLowerCase().includes('alias')
    );

    if (!sheetName) {
        // Fallback to first sheet
        sheetName = sheetNames[0];
        console.log(`   ⚠️ No 'Child SKU Master' sheet found, using first sheet: ${sheetName}`);
    } else {
        console.log(`   Using sheet: ${sheetName}`);
    }

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`   Found ${data.length} rows\n`);

    // Map SKU to identifiers
    const identifiersMap = new Map();

    // Expected columns (case-insensitive):
    // - Child SKU / Product Code / SKU Code
    // - Amazon ASIN
    // - Flipkart FSN
    // - Urban Ladder ID
    // - Pepperfry ID
    // - Myntra ID

    for (const row of data) {
        // Find SKU column (try different names)
        const sku = row['Child SKU'] ||
                    row['Product Code'] ||
                    row['SKU Code'] ||
                    row['Product_Code'] ||
                    row['SKU'];

        if (!sku) continue;

        const identifiers = [];

        // Map platform columns to identifier objects
        const platformMappings = [
            { channel: 'Amazon ASIN', keys: ['Amazon ASIN', 'ASIN', 'Amazon'] },
            { channel: 'Flipkart FSN', keys: ['Flipkart FSN', 'FSN', 'Flipkart'] },
            { channel: 'Urban Ladder', keys: ['Urban Ladder', 'Urban Ladder ID', 'UL ID'] },
            { channel: 'Pepperfry', keys: ['Pepperfry', 'Pepperfry ID', 'PF ID'] },
            { channel: 'Myntra', keys: ['Myntra', 'Myntra ID'] }
        ];

        for (const { channel, keys } of platformMappings) {
            for (const key of keys) {
                if (row[key] && row[key].toString().trim()) {
                    identifiers.push({
                        Channel: channel,
                        Identifier: row[key].toString().trim()
                    });
                    break; // Found value for this channel, move to next
                }
            }
        }

        if (identifiers.length > 0) {
            identifiersMap.set(sku, identifiers);
        }
    }

    console.log(`📊 Parsed ${identifiersMap.size} products with identifiers\n`);
    return identifiersMap;
}

async function populateProductIdentifiers() {
    console.log('🚀 Starting Product Identifiers population...\n');

    // Parse Excel
    const identifiersMap = parseProductIdentifiers();

    // Initialize MCP Client
    const transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-zoho']
    });

    const client = new Client({
        name: 'populate-product-identifiers',
        version: '1.0.0'
    }, {
        capabilities: {}
    });

    await client.connect(transport);
    console.log('✅ MCP Client connected\n');

    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    let totalIdentifiersAdded = 0;

    try {
        // Fetch all Products
        console.log('📦 Fetching Products from CRM...');

        let allProducts = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await callMCPTool(client, 'zoho-crm_get-records', {
                module: 'Products',
                fields: 'Product_Code,Product_Name,Product_Identifiers',
                per_page: 200,
                page: page
            });

            const products = response?.data || [];
            if (products.length === 0) {
                hasMore = false;
            } else {
                allProducts = allProducts.concat(products);
                page++;
                console.log(`   Fetched page ${page - 1}: ${products.length} products`);
            }
        }

        console.log(`   Total products: ${allProducts.length}\n`);

        // Update each product with identifiers from Excel
        for (const product of allProducts) {
            const sku = product.Product_Code;
            const identifiers = identifiersMap.get(sku);

            if (!identifiers) {
                notFound++;
                continue;
            }

            // Check if already has identifiers
            const existing = product.Product_Identifiers || [];
            if (existing.length > 0) {
                console.log(`   ⏭️  ${sku}: Already has ${existing.length} identifiers, skipping`);
                skipped++;
                continue;
            }

            console.log(`   📝 ${sku}: Adding ${identifiers.length} identifiers`);
            for (const id of identifiers) {
                console.log(`      - ${id.Channel}: ${id.Identifier}`);
            }

            try {
                await callMCPTool(client, 'zoho-crm_update-record', {
                    module: 'Products',
                    record_id: product.id,
                    data: {
                        Product_Identifiers: identifiers
                    }
                });

                updated++;
                totalIdentifiersAdded += identifiers.length;
            } catch (error) {
                console.error(`   ❌ Failed to update ${sku}: ${error.message}`);
            }

            // Rate limiting
            await new Promise(r => setTimeout(r, 500));
        }

        // Summary
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 POPULATION SUMMARY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ Products updated: ${updated}`);
        console.log(`⏭️  Products skipped (already have identifiers): ${skipped}`);
        console.log(`❌ Products not found in Excel: ${notFound}`);
        console.log(`📊 Total identifiers added: ${totalIdentifiersAdded}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('\n❌ Population failed:', error);
        throw error;
    } finally {
        await client.close();
        console.log('👋 MCP Client disconnected\n');
    }
}

// Run population
populateProductIdentifiers()
    .then(() => {
        console.log('✅ Population complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Population error:', error);
        process.exit(1);
    });
