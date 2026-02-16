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
    if (res.data.error) {
        console.error('MCP Error:', JSON.stringify(res.data.error, null, 2));
        throw new Error(res.data.error.message);
    }
    return JSON.parse(res.data.result.content[0].text);
}

async function fetchIds(module, fields) {
    let all = [];
    let page = 1;
    let hasMore = true;
    console.log(`📡 Fetching ${module}...`);
    while (hasMore) {
        const query_params = { fields, per_page: 200, page };
        console.log(`📡 GET ${module} fields: ${fields}`);
        const res = await callMCP('ZohoCRM_Get_Records', {
            path_variables: { module },
            query_params
        });
        console.log(`Fetched ${module} page ${page}:`, res.data ? res.data.length : 0, 'records');
        if (res.data) {
            all = all.concat(res.data);
            if (res.info.more_records) { page++; await sleep(200); } else hasMore = false;
        } else hasMore = false;
    }
    return all;
}

function inferCategory(name) {
    if (!name) return 'Furniture';
    const n = name.toLowerCase();

    // Furniture categories (matching audit app display)
    if (n.includes('chair') || n.includes('stool') || n.includes('bench')) return 'Seating';
    if (n.includes('table') || n.includes('desk')) return 'Tables & Desks';
    if (n.includes('bed') || n.includes('mattress')) return 'Beds & Mattresses';
    if (n.includes('sofa') || n.includes('couch') || n.includes('recliner')) return 'Sofas & Recliners';
    if (n.includes('wardrobe') || n.includes('cabinet') || n.includes('cupboard')) return 'Storage Cabinets';
    if (n.includes('rack') || n.includes('shelf') || n.includes('stand')) return 'Racks & Shelves';
    if (n.includes('chest') || n.includes('drawer')) return 'Chests & Drawers';
    if (n.includes('tv unit') || n.includes('entertainment')) return 'TV Units';
    if (n.includes('sideboard') || n.includes('buffet')) return 'Sideboards';

    // Home decor
    if (n.includes('mirror') || n.includes('wall art') || n.includes('frame')) return 'Wall Decor';
    if (n.includes('lamp') || n.includes('light')) return 'Lighting';
    if (n.includes('rug') || n.includes('carpet') || n.includes('mat')) return 'Rugs & Carpets';

    return 'Furniture';
}

function calculateWeightCategory(weightKg) {
    if (!weightKg || weightKg === 0) return null;
    const brackets = [5, 10, 20, 50, 100, 500];
    for (const b of brackets) {
        if (weightKg <= b) return `${b}kg`;
    }
    return '500kg+';
}

async function populateCategories() {
    console.log('\n' + '='.repeat(80));
    console.log('📦 POPULATE PRODUCT CATEGORIES (Proper Values)');
    console.log('='.repeat(80));
    console.log('\n⚠️  This script ONLY updates empty Product_Category fields');
    console.log('⚠️  Does NOT touch subforms or other fields\n');

    const masterData = JSON.parse(fs.readFileSync('unified_master_data.json', 'utf8'));

    // Parents
    const parentMaster = masterData.filter(r => r.module === 'Parent_MTP_SKU');
    const crmParents = await fetchIds('Parent_MTP_SKU', 'id,Name,Product_Category,Weight_Category_Billed,Billed_Physical_Weight');
    console.log('Sample Parent Record:', JSON.stringify(crmParents[0], null, 2));
    const parentIdMap = new Map(crmParents.map(r => [r.Name, {
        id: r.id,
        currentCat: r.Product_Category,
        currentWeightCat: r.Weight_Category_Billed,
        weight: r.Billed_Physical_Weight
    }]));

    console.log('--- Populating Parent Categories & Weight Categories ---');
    let pUpdated = 0;
    for (const mData of parentMaster) {
        const crmData = parentIdMap.get(mData.sku);
        if (!crmData) continue;

        const updates = {};

        // Update Product_Category if empty
        if (!crmData.currentCat) {
            updates.Product_Category = inferCategory(mData.name);
        }

        // Update Weight_Category_Billed if empty and weight exists
        if (!crmData.currentWeightCat && crmData.weight) {
            const weightCat = calculateWeightCategory(crmData.weight);
            if (weightCat) updates.Weight_Category_Billed = weightCat;
        }

        if (Object.keys(updates).length === 0) continue;

        await callMCP('ZohoCRM_Update_Record', {
            path_variables: { module: 'Parent_MTP_SKU', recordID: crmData.id },
            body: { data: [updates] }
        });

        pUpdated++;
        if (pUpdated % 20 === 0) console.log(`   Processed ${pUpdated} parents...`);
        await sleep(300);
    }

    // Children
    const childMaster = masterData.filter(r => r.module === 'Products');
    const crmChildren = await fetchIds('Products', 'id,Product_Code,Product_Category,Weight_Category_Billed,Total_Weight');
    const childIdMap = new Map(crmChildren.map(r => [r.Product_Code, {
        id: r.id,
        currentCat: r.Product_Category,
        currentWeightCat: r.Weight_Category_Billed,
        weight: r.Total_Weight
    }]));

    console.log('\n--- Populating Child Categories & Weight Categories ---');
    let cUpdated = 0;
    for (const mData of childMaster) {
        const crmData = childIdMap.get(mData.sku);
        if (!crmData) continue;

        const updates = {};

        // Update Product_Category if empty
        if (!crmData.currentCat) {
            updates.Product_Category = inferCategory(mData.name);
        }

        // Update Weight_Category_Billed if empty and weight exists
        if (!crmData.currentWeightCat && crmData.weight) {
            const weightCat = calculateWeightCategory(crmData.weight);
            if (weightCat) updates.Weight_Category_Billed = weightCat;
        }

        if (Object.keys(updates).length === 0) continue;

        await callMCP('ZohoCRM_Update_Record', {
            path_variables: { module: 'Products', recordID: crmData.id },
            body: { data: [updates] }
        });

        cUpdated++;
        if (cUpdated % 20 === 0) console.log(`   Processed ${cUpdated} children...`);
        await sleep(300);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ CATEGORY POPULATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`Parents Updated: ${pUpdated}`);
    console.log(`Children Updated: ${cUpdated}`);
}

populateCategories();
