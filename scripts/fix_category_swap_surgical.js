import fs from 'fs';
import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callMCP(toolName, args) {
    const payload = {
        jsonrpc: "2.0", id: Date.now(), method: "tools/call",
        params: { name: toolName, arguments: args }
    };
    const res = await axios.post(BASE_URL, payload);
    if (res.data.error) throw new Error(res.data.error.message);
    return JSON.parse(res.data.result.content[0].text);
}

async function fetchAllRecords(module) {
    let all = [];
    let page = 1;
    let hasMore = true;
    console.log(`📡 Fetching ${module}...`);
    while (hasMore) {
        const res = await callMCP('ZohoCRM_Get_Records', {
            path_variables: { module },
            query_params: {
                fields: 'id,Name,Product_Code,Product_Category,Weight_Category_Billed',
                per_page: 200,
                page
            }
        });
        if (res.data) {
            all = all.concat(res.data);
            if (res.info.more_records) { page++; await sleep(200); } else hasMore = false;
        } else hasMore = false;
    }
    return all;
}

async function fixSwappedCategories() {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 SURGICAL FIX: Category/Weight Swap Cleanup');
    console.log('='.repeat(80));
    console.log('\n⚠️  This script ONLY updates Product_Category fields');
    console.log('⚠️  It does NOT touch subforms (no duplication risk)');
    console.log('⚠️  Safe to run multiple times (idempotent)\n');

    const parents = await fetchAllRecords('Parent_MTP_SKU');
    const children = await fetchAllRecords('Products');

    // Pattern to detect weight in Product_Category (e.g., "20kg", "50 kg", "<5kg")
    const weightPattern = /^[<>]?\d+\s*kg$/i;

    // Find records with swapped data
    const swappedParents = parents.filter(p => {
        const cat = (p.Product_Category || '').toString().trim();
        return weightPattern.test(cat);
    });

    const swappedChildren = children.filter(c => {
        const cat = (c.Product_Category || '').toString().trim();
        return weightPattern.test(cat);
    });

    console.log(`Found ${swappedParents.length} Parents with swapped categories`);
    console.log(`Found ${swappedChildren.length} Children with swapped categories\n`);

    let pFixed = 0, cFixed = 0;

    // Fix Parents
    if (swappedParents.length > 0) {
        console.log('--- Fixing Parent_MTP_SKU ---');
        for (const record of swappedParents) {
            const wrongCat = record.Product_Category.toString().trim();

            // Clear Product_Category (set to null)
            await callMCP('ZohoCRM_Update_Record', {
                path_variables: { module: 'Parent_MTP_SKU', recordID: record.id },
                body: { data: [{ Product_Category: null }] }
            });

            console.log(`✅ Fixed ${record.Name}: Cleared "${wrongCat}" from Product_Category`);
            pFixed++;
            await sleep(300);
        }
    }

    // Fix Children
    if (swappedChildren.length > 0) {
        console.log('\n--- Fixing Products ---');
        for (const record of swappedChildren) {
            const wrongCat = record.Product_Category.toString().trim();

            // Clear Product_Category (set to null)
            await callMCP('ZohoCRM_Update_Record', {
                path_variables: { module: 'Products', recordID: record.id },
                body: { data: [{ Product_Category: null }] }
            });

            console.log(`✅ Fixed ${record.Product_Code}: Cleared "${wrongCat}" from Product_Category`);
            cFixed++;
            await sleep(300);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ CATEGORY SWAP FIX COMPLETE');
    console.log('='.repeat(80));
    console.log(`Parents Fixed: ${pFixed}`);
    console.log(`Children Fixed: ${cFixed}`);
    console.log(`\n📝 Note: Product_Category fields are now cleared.`);
    console.log(`   Run populate_crm_database_FIXED.js to repopulate with correct categories.`);
}

fixSwappedCategories();
