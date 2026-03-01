import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

async function test() {
    console.log('🔍 Testing ZohoCRM_Get_Records...');

    const payload = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
            name: "ZohoCRM_Get_Records",
            arguments: {
                path_variables: { module: "Parent_MTP_SKU" },
                query_params: { per_page: 10 }
            }
        }
    };

    try {
        const res = await axios.post(BASE_URL, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('Response:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.log('Error:', err.message);
    }
}

test();
