import fs from 'fs';
import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callTool(name, args) {
    try {
        const res = await axios.post(BASE_URL, {
            jsonrpc: "2.0", id: Date.now(), method: "tools/call",
            params: { name, arguments: args }
        }, { headers: { 'Content-Type': 'application/json' }, timeout: 60000 });

        if (res.data.result?.content?.[0]?.text) {
            const text = res.data.result.content[0].text;
            try {
                return JSON.parse(text);
            } catch (e) {
                return text;
            }
        }
    } catch (err) { }
    return null;
}

async function fetchAllRecordIds(module, idField) {
    let allRecords = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
        const res = await callTool('ZohoCRM_Get_Records', {
            path_variables: { module: module },
            query_params: { fields: idField, per_page: 200, page: page }
        });
        if (res && res.data) {
            allRecords = allRecords.concat(res.data);
            if (res.info?.more_records) { page++; await sleep(200); } else hasMore = false;
        } else hasMore = false;
    }
    return allRecords;
}

async function runCleanHighFidelitySync() {
    console.log('🚀 Starting Clean High Fidelity Sync...');

    const masterData = JSON.parse(fs.readFileSync('unified_master_data.json', 'utf8'));
    const parentMaster = masterData.filter(r => r.module === 'Parent_MTP_SKU');
    const childMaster = masterData.filter(r => r.module === 'Products');

    const crmParents = await fetchAllRecordIds('Parent_MTP_SKU', 'Name');
    const parentIdMap = new Map(crmParents.map(r => [r.Name, r.id]));

    const crmChildren = await fetchAllRecordIds('Products', 'Product_Code');
    const childIdMap = new Map(crmChildren.map(r => [r.Product_Code, r.id]));

    let stats = { p: 0, c: 0, pf: 0, cf: 0 };

    console.log('\n--- Syncing Parents ---');
    for (const mData of parentMaster) {
        const recordId = parentIdMap.get(mData.sku);
        if (!recordId) continue;

        const updates = {
            Product_Category: mData.category,
            Weight_Category_Billed: mData.weight_category,
            Billed_Physical_Weight: Math.round(mData.weight_kg * 100) / 100,
            Live_Status: mData.live_status === 'DI' ? 'N' : (mData.isActive ? 'Y' : 'N'),
            Product_MTP_Name: mData.name,
            Unit_Price: mData.mrp || 0
        };

        if (mData.dimensions.boxes && mData.dimensions.boxes.length > 0) {
            updates.MTP_Box_Dimensions = mData.dimensions.boxes.map((b, i) => ({
                Box: String(i + 1),
                Length: Math.round(b.length), Width: Math.round(b.width), Height: Math.round(b.height),
                Weight: Math.round((b.weightGrams / 1000) * 100) / 100,
                Box_Measurement: 'cm', Weight_Measurement: 'kg'
            }));
        }

        const res = await callTool('ZohoCRM_Update_Record', {
            path_variables: { module: 'Parent_MTP_SKU', recordID: recordId },
            body: { data: [updates] }
        });

        if (res?.data?.[0]?.code === 'SUCCESS') stats.p++; else stats.pf++;
        if ((stats.p + stats.pf) % 20 === 0) console.log(`   Processed ${stats.p + stats.pf} parents...`);
        await sleep(350);
    }

    console.log('\n--- Syncing Children ---');
    for (const mData of childMaster) {
        const recordId = childIdMap.get(mData.sku);
        if (!recordId) continue;

        const updates = {
            Product_Category: mData.category,
            Weight_Category_Billed: mData.weight_category,
            Live_Status: mData.live_status === 'DI' ? 'N' : (mData.live_status || 'Y'),
            Last_Audited_Total_Weight_kg: Math.round(mData.weight_kg * 100) / 100,
            Unit_Price: mData.mrp || 0
        };

        if (mData.dimensions.boxes && mData.dimensions.boxes.length > 0) {
            updates.Bill_Dimension_Weight = mData.dimensions.boxes.map((b, i) => ({
                BL: String(i + 1),
                Length: Math.round(b.length), Width: Math.round(b.width), Height: Math.round(b.height),
                Weight: Math.round((b.weightGrams / 1000) * 100) / 100,
                Box_Measurement: 'cm', Weight_Measurement: 'kg'
            }));
        }

        const res = await callTool('ZohoCRM_Update_Record', {
            path_variables: { module: 'Products', recordID: recordId },
            body: { data: [updates] }
        });

        if (res?.data?.[0]?.code === 'SUCCESS') stats.c++; else stats.cf++;
        if ((stats.c + stats.cf) % 50 === 0) console.log(`   Processed ${stats.c + stats.cf} children...`);
        await sleep(350);
    }

    console.log(`\n🎉 FINAL SYNC COMPLETE: ParentsSuccess: ${stats.p}, ParentsFail: ${stats.pf}, ChildSuccess: ${stats.c}, ChildFail: ${stats.cf}`);
}

runCleanHighFidelitySync();
