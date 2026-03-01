import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

async function getFields() {
    const payload = {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: {
            name: "ZohoCRM_Get_Fields",
            arguments: {
                query_params: { module: "Product_Identifiers" }
            }
        }
    };

    const res = await axios.post(BASE_URL, payload, { headers: { 'Content-Type': 'application/json' } });

    if (res.data.result?.content?.[0]) {
        console.log(res.data.result.content[0].text);
    } else {
        console.log(JSON.stringify(res.data, null, 2));
    }
}

getFields();
