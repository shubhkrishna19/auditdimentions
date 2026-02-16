import fs from 'fs';
import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

const CONFIG = {
    BATCH_SIZE: 10,
    DELAY: 300,
    // ONLY AR and DI are Not Live. All others are Live.
    NOT_LIVE_CODES: ['AR', 'DI']
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callMCP(toolName, args) {
    const payload = {
        jsonrpc: "2.0", id: Date.now(), method: "tools/call",
        params: { name: toolName, arguments: args }
    };
    const res = await axios.post(BASE_URL, payload);
    if (res.data.error) {
        console.error('MCP Error:', JSON.stringify(res.data.error, null, 2));
        throw new Error(res.data.error.message);
    }
    return JSON.parse(res.data.result.content[0].text);
}

async function fetchIds(module, field) {
    let all = [];
    let page = 1;
    let hasMore = true;
    console.log(`📡 Fetching ${module} IDs...`);
    while (hasMore) {
        const res = await callMCP('ZohoCRM_Get_Records', {
            path_variables: { module },
            query_params: { fields: field, per_page: 50, page }
        });
        if (res.data) {
            all = all.concat(res.data);
            if (res.info.more_records) { page++; await sleep(200); } else hasMore = false;
        } else hasMore = false;
    }
    return all;
}

async function runFix() {
    console.log('🚀 Starting Strategic Live Status Fix (High Precision)...');
    const masterData = JSON.parse(fs.readFileSync('unified_master_data.json', 'utf8'));

    // 1. Update CHILDREN first
    const childMaster = masterData.filter(r => r.module === 'Products');
    const crmChildren = await fetchIds('Products', 'Product_Code');
    const childIdMap = new Map(crmChildren.map(r => [r.Product_Code, r.id]));

    // Map to track parent status based on children
    const parentLiveSupport = new Map(); // parentSku -> boolean (has live child)

    console.log(`\n--- Fixing ${childMaster.length} Children ---`);
    let cSuccess = 0;
    for (const mData of childMaster) {
        const recordId = childIdMap.get(mData.sku);
        if (!recordId) continue;

        const excelStatus = (mData.liveStatus || mData.status || '').toUpperCase();
        const status = CONFIG.NOT_LIVE_CODES.includes(excelStatus) ? 'Not Live' : 'Live';

        // Track for parent
        if (status === 'Live' && mData.parentSku) {
            parentLiveSupport.set(mData.parentSku, true);
        } else if (mData.parentSku && !parentLiveSupport.has(mData.parentSku)) {
            parentLiveSupport.set(mData.parentSku, false);
        }

        await callMCP('ZohoCRM_Update_Record', {
            path_variables: { module: 'Products', recordID: recordId },
            body: { data: [{ Live_Status: status }] }
        });
        cSuccess++;
        if (cSuccess % 20 === 0) console.log(`   Processed ${cSuccess} children...`);
        await sleep(300);
    }

    // 2. Update PARENTS second
    const parentMaster = masterData.filter(r => r.module === 'Parent_MTP_SKU');
    const crmParents = await fetchIds('Parent_MTP_SKU', 'Name');
    const parentIdMap = new Map(crmParents.map(r => [r.Name, r.id]));

    console.log(`\n--- Fixing ${parentMaster.length} Parents based on Child Status ---`);
    let pSuccess = 0;
    for (const mData of parentMaster) {
        const recordId = parentIdMap.get(mData.sku);
        if (!recordId) continue;

        // Parent is Live if at least one child is Live, OR if it has no children but is marked active in master
        const hasLiveChild = parentLiveSupport.get(mData.sku);
        const status = (hasLiveChild === true || (hasLiveChild === undefined && mData.isActive)) ? 'Live' : 'Not Live';

        await callMCP('ZohoCRM_Update_Record', {
            path_variables: { module: 'Parent_MTP_SKU', recordID: recordId },
            body: { data: [{ ProductActive: status }] }
        });
        pSuccess++;
        if (pSuccess % 20 === 0) console.log(`   Processed ${pSuccess} parents...`);
        await sleep(300);
    }

    console.log('\n✅ Live Status Fix Complete.');
    console.log(`Children Updated: ${cSuccess}, Parents Updated: ${pSuccess}`);
}

runFix();
