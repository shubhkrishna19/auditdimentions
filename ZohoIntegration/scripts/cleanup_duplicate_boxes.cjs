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
const axios = require('axios');

const MCP_URL = process.env.MCP_SERVER_URL;
const MCP_KEY = process.env.MCP_API_KEY;
const BASE_URL = `${MCP_URL}?key=${MCP_KEY}`;

// MCP HTTP Tool Call Helper
async function callMCPTool(toolName, args) {
    const payload = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: toolName, arguments: args }
    };

    const response = await axios.post(BASE_URL, payload, {
        headers: { 'Content-Type': 'application/json' }
    });

    if (response.data.error) {
        throw new Error(`MCP Error: ${JSON.stringify(response.data.error)}`);
    }

    const textContent = response.data.result?.content?.[0]?.text;
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
    console.log(`📡 Using MCP endpoint: ${MCP_URL}\n`);

    let parentsCleaned = 0;
    let childrenCleaned = 0;
    let totalBoxesRemoved = 0;

    try {
        // 1. Clean Parent_MTP_SKU products
        console.log('📦 Fetching Parent_MTP_SKU products...');
        const parentsResponse = await callMCPTool('ZohoCRM_Get_Records', {
            path_variables: { module: 'Parent_MTP_SKU' },
            query_params: { fields: 'all', per_page: 200 }
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
                    await callMCPTool('ZohoCRM_Update_Record', {
                        path_variables: { module: 'Parent_MTP_SKU', recordID: parent.id },
                        body: { data: [{ MTP_Box_Dimensions: uniqueBoxes }] }
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
        const childrenResponse = await callMCPTool('ZohoCRM_Get_Records', {
            path_variables: { module: 'Products' },
            query_params: { fields: 'all', per_page: 200 }
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
                    await callMCPTool('ZohoCRM_Update_Record', {
                        path_variables: { module: 'Products', recordID: child.id },
                        body: { data: [{ Bill_Dimension_Weight: uniqueBoxes }] }
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
