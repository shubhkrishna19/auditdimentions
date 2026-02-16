/**
 * Cleanup Duplicate Box Entries - FIXED VERSION
 * Uses Get_Record (singular) to fetch subform data properly
 */

require('dotenv').config({ path: '.env.mcp' });
const axios = require('axios');

const MCP_URL = process.env.MCP_SERVER_URL;
const MCP_KEY = process.env.MCP_API_KEY;
const BASE_URL = `${MCP_URL}?key=${MCP_KEY}`;

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

    const seen = new Map();
    const unique = [];

    for (const box of boxes) {
        // Create unique key from box properties
        const key = `${box.Box || box.BL}-${box.Length}-${box.Width}-${box.Height}-${box.Weight}`;

        if (!seen.has(key)) {
            seen.set(key, box);
            unique.push(box);
        }
    }

    return unique;
}

async function cleanupDuplicateBoxes() {
    console.log('🧹 Starting duplicate box cleanup (FIXED VERSION)...\n');
    console.log(`📡 Using MCP endpoint: ${MCP_URL}\n`);

    let parentsCleaned = 0;
    let childrenCleaned = 0;
    let totalBoxesRemoved = 0;

    try {
        // 1. Get list of all Parent IDs first
        console.log('📦 Fetching Parent_MTP_SKU IDs...');
        const parentsListResponse = await callMCPTool('ZohoCRM_Get_Records', {
            path_variables: { module: 'Parent_MTP_SKU' },
            query_params: { fields: 'id,Name', per_page: 200 }
        });

        const parentIds = (parentsListResponse?.data || []).map(p => ({ id: p.id, name: p.Name }));
        console.log(`   Found ${parentIds.length} parents\n`);

        // 2. Fetch each parent individually to get subform data
        console.log('🔍 Checking parents for duplicate boxes...');
        for (const { id, name } of parentIds) {
            try {
                const parentResponse = await callMCPTool('ZohoCRM_Get_Record', {
                    path_variables: { module: 'Parent_MTP_SKU', recordID: id }
                });

                const parent = parentResponse?.data?.[0];
                if (!parent) continue;

                const originalBoxes = parent.MTP_Box_Dimensions || [];
                if (originalBoxes.length === 0) continue;

                const uniqueBoxes = deduplicateBoxes(originalBoxes);

                if (originalBoxes.length !== uniqueBoxes.length) {
                    const removed = originalBoxes.length - uniqueBoxes.length;
                    console.log(`   ${name}: ${originalBoxes.length} → ${uniqueBoxes.length} boxes (removed ${removed} duplicates)`);

                    // Update with deduplicated boxes
                    await callMCPTool('ZohoCRM_Update_Record', {
                        path_variables: { module: 'Parent_MTP_SKU', recordID: id },
                        body: { data: [{ MTP_Box_Dimensions: uniqueBoxes }] }
                    });

                    parentsCleaned++;
                    totalBoxesRemoved += removed;

                    // Rate limiting
                    await new Promise(r => setTimeout(r, 300));
                }
            } catch (error) {
                console.error(`   ❌ Failed to process ${name}: ${error.message}`);
            }
        }

        console.log(`\n✅ Parents cleaned: ${parentsCleaned}`);
        console.log(`   Total duplicate boxes removed from parents: ${totalBoxesRemoved}\n`);

        // 3. Get list of all Product IDs
        console.log('📦 Fetching Products IDs...');
        const childrenListResponse = await callMCPTool('ZohoCRM_Get_Records', {
            path_variables: { module: 'Products' },
            query_params: { fields: 'id,Product_Code', per_page: 200 }
        });

        const childIds = (childrenListResponse?.data || []).map(c => ({ id: c.id, code: c.Product_Code }));
        console.log(`   Found ${childIds.length} children\n`);

        // 4. Fetch each child individually to get subform data
        console.log('🔍 Checking children for duplicate boxes...');
        let childBoxesRemoved = 0;

        for (const { id, code } of childIds) {
            try {
                const childResponse = await callMCPTool('ZohoCRM_Get_Record', {
                    path_variables: { module: 'Products', recordID: id }
                });

                const child = childResponse?.data?.[0];
                if (!child) continue;

                const originalBoxes = child.Bill_Dimension_Weight || [];
                if (originalBoxes.length === 0) continue;

                const uniqueBoxes = deduplicateBoxes(originalBoxes);

                if (originalBoxes.length !== uniqueBoxes.length) {
                    const removed = originalBoxes.length - uniqueBoxes.length;
                    console.log(`   ${code}: ${originalBoxes.length} → ${uniqueBoxes.length} boxes (removed ${removed} duplicates)`);

                    // Update with deduplicated boxes
                    await callMCPTool('ZohoCRM_Update_Record', {
                        path_variables: { module: 'Products', recordID: id },
                        body: { data: [{ Bill_Dimension_Weight: uniqueBoxes }] }
                    });

                    childrenCleaned++;
                    childBoxesRemoved += removed;

                    // Rate limiting
                    await new Promise(r => setTimeout(r, 300));
                }
            } catch (error) {
                console.error(`   ❌ Failed to process ${code}: ${error.message}`);
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
