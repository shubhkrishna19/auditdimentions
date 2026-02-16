import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

async function getAllFields() {
    const modules = ["Parent_MTP_SKU", "Products", "Product_Identifiers"];

    for (const mod of modules) {
        console.log(`\n--- Fields for ${mod} ---`);
        const payload = {
            jsonrpc: "2.0", id: 1, method: "tools/call",
            params: {
                name: "ZohoCRM_Get_Fields",
                arguments: {
                    query_params: { module: mod }
                }
            }
        };

        const res = await axios.post(BASE_URL, payload, { headers: { 'Content-Type': 'application/json' } });
        if (res.data.result?.content?.[0]) {
            const text = res.data.result.content[0].text;
            const data = JSON.parse(text);
            const slim = data.fields.map(f => ({ label: f.field_label, api: f.api_name, type: f.data_type }));
            fs.writeFileSync(`${mod}_fields_slim.json`, JSON.stringify(slim, null, 2));
            console.log(`✅ Saved ${slim.length} fields for ${mod}`);
        } else {
            console.log(`❌ Failed for ${mod}:`, JSON.stringify(res.data, null, 2));
        }
    }
}

getAllFields();
