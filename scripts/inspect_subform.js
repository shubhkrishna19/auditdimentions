import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

async function getSubformFields() {
    const payload = {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: {
            name: "ZohoCRM_Get_Fields",
            arguments: {
                query_params: { module: "Products", type: "all" }
            }
        }
    };

    const res = await axios.post(BASE_URL, payload, { headers: { 'Content-Type': 'application/json' } });
    if (res.data.result?.content?.[0]) {
        const data = JSON.parse(res.data.result.content[0].text);
        const subform = data.fields.find(f => f.api_name === 'Product_Identifiers');
        console.log(JSON.stringify(subform, null, 2));
    }
}

getSubformFields();
