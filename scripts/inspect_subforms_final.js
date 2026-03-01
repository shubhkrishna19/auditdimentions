import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

async function checkSubforms() {
    const modules = [
        { parent: 'Parent_MTP_SKU', sub: 'MTP_Box_Dimensions' },
        { parent: 'Products', sub: 'Bill_Dimension_Weight' }
    ];

    for (const m of modules) {
        console.log(`\n--- Inspecting ${m.parent} -> ${m.sub} ---`);
        const p1 = {
            jsonrpc: "2.0", id: 1, method: "tools/call",
            params: {
                name: "ZohoCRM_Get_Fields",
                arguments: { query_params: { module: m.parent } }
            }
        };
        const res1 = await axios.post(BASE_URL, p1, { headers: { 'Content-Type': 'application/json' } });
        const fields = JSON.parse(res1.data.result.content[0].text).fields;
        const subformDetails = fields.find(f => f.api_name === m.sub);
        const assocModule = subformDetails.associated_module.module;

        const p2 = {
            jsonrpc: "2.0", id: 2, method: "tools/call",
            params: {
                name: "ZohoCRM_Get_Fields",
                arguments: { query_params: { module: assocModule } }
            }
        };
        const res2 = await axios.post(BASE_URL, p2, { headers: { 'Content-Type': 'application/json' } });
        const subFields = JSON.parse(res2.data.result.content[0].text).fields;
        subFields.forEach(f => console.log(`  - ${f.api_name} (${f.field_label})`));
    }
}

checkSubforms();
