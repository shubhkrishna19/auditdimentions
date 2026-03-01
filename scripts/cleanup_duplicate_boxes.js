/**
 * Cleanup Duplicate Box Entries in Zoho CRM
 *
 * Problem: Running population scripts multiple times created duplicate box entries
 * Example: Box 1 appears 3 times with identical dimensions
 *
 * Solution: For each product, deduplicate boxes by keeping only unique entries
 * based on box number and dimensions.
 */

require('dotenv').config({ path: '.env.mcp' });
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

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

// Deduplicate boxes array
function deduplicateBoxes(boxes) {
    if (!boxes || boxes.length === 0) return [];

    const seen = new Set();
    const unique = [];

    for (const box of boxes) {
        // Create unique key from box properties
        const key = `${box.Box || box.BL}-${box.Length}-${box.Width}-${box.Height}-${box.Weight}`;

        if (!seen.has(key)) {
            seen.add(key);
            unique.push(box);
        }
    }

    return unique;
}

async function cleanupDuplicateBoxes() {
    console.log('🧹 Starting duplicate box cleanup...\n');

    // Initialize MCP Client
    const transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-zoho']
    });

    const client = new Client({
        name: 'cleanup-duplicate-boxes',
        version: '1.0.0'
    }, {
        capabilities: {}
    });

    await client.connect(transport);
    console.log('✅ MCP Client connected\n');

    let parentsCleaned = 0;
    let childrenCleaned = 0;
    let totalBoxesRemoved = 0;

    try {
        // 1. Clean Parent_MTP_SKU products
        console.log('📦 Fetching Parent_MTP_SKU products...');
        const parentsResponse = await callMCPTool(client, 'zoho-crm_get-records', {
            module: 'Parent_MTP_SKU',
            fields: 'all',
            per_page: 200
        });

        const parents = parentsResponse?.data || [];
        console.log(`   Found ${parents.length} parent products\n`);

        for (const parent of parents) {
            const originalBoxes = parent.MTP_Box_Dimensions || [];
            const uniqueBoxes = deduplicateBoxes(originalBoxes);

            if (originalBoxes.length !== uniqueBoxes.length) {
                const removed = originalBoxes.length - uniqueBoxes.length;
                console.log(`   ${parent.Name}: ${originalBoxes.length} → ${uniqueBoxes.length} boxes (removed ${removed} duplicates)`);

                // Update with deduplicated boxes
                try {
                    await callMCPTool(client, 'zoho-crm_update-record', {
                        module: 'Parent_MTP_SKU',
                        record_id: parent.id,
                        data: {
                            MTP_Box_Dimensions: uniqueBoxes
                        }
                    });

                    parentsCleaned++;
                    totalBoxesRemoved += removed;
                } catch (error) {
                    console.error(`   ❌ Failed to update ${parent.Name}: ${error.message}`);
                }

                // Rate limiting
                await new Promise(r => setTimeout(r, 500));
            }
        }

        console.log(`\n✅ Parents cleaned: ${parentsCleaned}`);
        console.log(`   Total duplicate boxes removed from parents: ${totalBoxesRemoved}\n`);

        // 2. Clean Products (children)
        console.log('📦 Fetching Products (children)...');
        const childrenResponse = await callMCPTool(client, 'zoho-crm_get-records', {
            module: 'Products',
            fields: 'all',
            per_page: 200
        });

        const children = childrenResponse?.data || [];
        console.log(`   Found ${children.length} child products\n`);

        let childBoxesRemoved = 0;

        for (const child of children) {
            const originalBoxes = child.Bill_Dimension_Weight || [];
            const uniqueBoxes = deduplicateBoxes(originalBoxes);

            if (originalBoxes.length !== uniqueBoxes.length) {
                const removed = originalBoxes.length - uniqueBoxes.length;
                console.log(`   ${child.Product_Code}: ${originalBoxes.length} → ${uniqueBoxes.length} boxes (removed ${removed} duplicates)`);

                // Update with deduplicated boxes
                try {
                    await callMCPTool(client, 'zoho-crm_update-record', {
                        module: 'Products',
                        record_id: child.id,
                        data: {
                            Bill_Dimension_Weight: uniqueBoxes
                        }
                    });

                    childrenCleaned++;
                    childBoxesRemoved += removed;
                } catch (error) {
                    console.error(`   ❌ Failed to update ${child.Product_Code}: ${error.message}`);
                }

                // Rate limiting
                await new Promise(r => setTimeout(r, 500));
            }
        }

        console.log(`\n✅ Children cleaned: ${childrenCleaned}`);
        console.log(`   Total duplicate boxes removed from children: ${childBoxesRemoved}\n`);

        // Final Summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 CLEANUP SUMMARY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ Total products cleaned: ${parentsCleaned + childrenCleaned}`);
        console.log(`   - Parents: ${parentsCleaned}`);
        console.log(`   - Children: ${childrenCleaned}`);
        console.log(`\n📦 Total duplicate boxes removed: ${totalBoxesRemoved + childBoxesRemoved}`);
        console.log(`   - From parents: ${totalBoxesRemoved}`);
        console.log(`   - From children: ${childBoxesRemoved}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('\n❌ Cleanup failed:', error);
        throw error;
    } finally {
        await client.close();
        console.log('👋 MCP Client disconnected\n');
    }
}

// Run cleanup
cleanupDuplicateBoxes()
    .then(() => {
        console.log('✅ Cleanup complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Cleanup error:', error);
        process.exit(1);
    });
