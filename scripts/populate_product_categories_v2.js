import fs from 'fs';
import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callMCP(toolName, args) {
    const payload = {
        jsonrpc: "2.0", id: Date.now(), method: "tools/call",
        params: { name: toolName, arguments: args }
    };
    try {
        const res = await axios.post(BASE_URL, payload);
        if (res.data.error) {
            console.error(`❌ MCP Tool Error (${toolName}):`, JSON.stringify(res.data.error, null, 2));
            return null;
        }
        if (!res.data.result?.content?.[0]?.text) {
            console.error(`❌ MCP Response Empty (${toolName})`);
            return null;
        }
        return JSON.parse(res.data.result.content[0].text);
    } catch (err) {
        console.error(`❌ HTTP Error (${toolName}):`, err.message);
        return null;
    }
}

async function fetchIds(module, fields) {
    let all = [];
    let page = 1;
    let hasMore = true;
    console.log(`📡 Fetching ${module}...`);
    while (hasMore) {
        const res = await callMCP('ZohoCRM_Get_Records', {
            path_variables: { module },
            query_params: { fields, per_page: 50, page }
        });
        if (res && res.data) {
            all = all.concat(res.data);
            console.log(`   Page ${page}: ${res.data.length} records`);
            if (res.info?.more_records) {
                page++;
                await sleep(500);
            } else hasMore = false;
        } else {
            hasMore = false;
        }
    }
    return all;
}

function inferCategory(name) {
    if (!name) return 'Furniture';
    const n = name.toLowerCase();
    if (n.includes('chair') || n.includes('stool') || n.includes('bench')) return 'Seating';
    if (n.includes('table') || n.includes('desk')) return 'Tables & Desks';
    if (n.includes('bed') || n.includes('mattress')) return 'Beds & Mattresses';
    if (n.includes('sofa') || n.includes('couch') || n.includes('recliner')) return 'Sofas & Recliners';
    if (n.includes('wardrobe') || n.includes('cabinet') || n.includes('cupboard')) return 'Storage Cabinets';
    if (n.includes('rack') || n.includes('shelf') || n.includes('stand')) return 'Racks & Shelves';
    if (n.includes('chest') || n.includes('drawer')) return 'Chests & Drawers';
    if (n.includes('tv unit') || n.includes('entertainment')) return 'TV Units';
    if (n.includes('sideboard') || n.includes('buffet')) return 'Sideboards';
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

async function run() {
    const masterData = JSON.parse(fs.readFileSync('unified_master_data.json', 'utf8'));

    // 1. Process Parents
    console.log('\n--- Processing Parent_MTP_SKU ---');
    const parents = await fetchIds('Parent_MTP_SKU', 'id,Name,Product_Category,Weight_Category_Billed,Billed_Physical_Weight');
    if (parents.length > 0) {
        const masterParents = masterData.filter(r => r.module === 'Parent_MTP_SKU');
        const masterMap = new Map(masterParents.map(r => [r.sku, r]));

        for (const p of parents) {
            const m = masterMap.get(p.Name);
            const updates = {};

            // Fix Product_Category if it looks like a weight or is empty
            const currentCat = (p.Product_Category || '').toString();
            if (!currentCat || currentCat.includes('kg')) {
                updates.Product_Category = inferCategory(m ? m.name : p.Name);
            }

            // Set Weight_Category_Billed if missing or wrong
            const weight = p.Billed_Physical_Weight || 0;
            const targetWeightCat = calculateWeightCategory(weight);
            if (targetWeightCat && p.Weight_Category_Billed !== targetWeightCat) {
                updates.Weight_Category_Billed = targetWeightCat;
            }

            if (Object.keys(updates).length > 0) {
                console.log(`   Update ${p.Name}:`, updates);
                await callMCP('ZohoCRM_Update_Record', {
                    path_variables: { module: 'Parent_MTP_SKU', recordID: p.id },
                    body: { data: [updates] }
                });
                await sleep(300);
            }
        }
    }

    // 2. Process Children
    console.log('\n--- Processing Products ---');
    const children = await fetchIds('Products', 'id,Product_Code,Product_Category,Weight_Category_Billed,Total_Weight');
    if (children.length > 0) {
        const masterChildren = masterData.filter(r => r.module === 'Products');
        const masterMap = new Map(masterChildren.map(r => [r.sku, r]));

        for (const c of children) {
            const m = masterMap.get(c.Product_Code);
            const updates = {};

            const currentCat = (c.Product_Category || '').toString();
            if (!currentCat || currentCat.includes('kg')) {
                updates.Product_Category = inferCategory(m ? m.name : c.Product_Code);
            }

            const weight = c.Total_Weight || 0;
            const targetWeightCat = calculateWeightCategory(weight);
            if (targetWeightCat && c.Weight_Category_Billed !== targetWeightCat) {
                updates.Weight_Category_Billed = targetWeightCat;
            }

            if (Object.keys(updates).length > 0) {
                console.log(`   Update ${c.Product_Code}:`, updates);
                await callMCP('ZohoCRM_Update_Record', {
                    path_variables: { module: 'Products', recordID: c.id },
                    body: { data: [updates] }
                });
                await sleep(300);
            }
        }
    }

    console.log('\n✅ All categories and weights synchronized.');
}

run();
