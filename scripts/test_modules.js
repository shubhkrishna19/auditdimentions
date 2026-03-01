import axios from 'axios';

const BASE_URL = 'https://bluewudcoredev-914343802.zohomcp.com/mcp/message?key=1744fb0b80fd85224f61b41e8f0f5d12';

async function testModules() {
    console.log('🔍 Testing ZohoCRM_Get_Modules...');

    const payload = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
            name: "ZohoCRM_Get_Modules",
            arguments: {}
        }
    };

    try {
        const res = await axios.post(BASE_URL, payload, { headers: { 'Content-Type': 'application/json' } });
        console.log('Response:', JSON.stringify(res.data, null, 2).substring(0, 1000));
    } catch (err) {
        console.log('Error:', err.message);
    }
}

testModules();
